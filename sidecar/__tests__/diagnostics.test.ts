import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { readFile } from 'node:fs/promises';
import { buildTestApp } from './testHarness';

const argValue = (args: string[], flag: string) => {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const filePath = (fileb: string | undefined) => fileb?.replace(/^fileb:\/\//, '');

/**
 * Simulates a real KMS round-trip by treating the cipher as a base64-wrapped copy
 * of the plaintext. Cryptography is not what we're testing — the service's wiring is.
 */
const kmsRoundTripResponder = async (args: string[]): Promise<unknown> => {
  if (args[0] === 'kms' && args[1] === 'create-key') {
    return { KeyMetadata: { KeyId: 'diag-key-id', Arn: 'arn:aws:kms:us-east-1:000000000000:key/diag-key-id' } };
  }
  if (args[0] === 'kms' && args[1] === 'encrypt') {
    const path = filePath(argValue(args, '--plaintext'));
    if (!path) throw new Error('encrypt missing --plaintext');
    const content = await readFile(path);
    return { CiphertextBlob: content.toString('base64'), KeyId: 'diag-key-id' };
  }
  if (args[0] === 'kms' && args[1] === 'decrypt') {
    const path = filePath(argValue(args, '--ciphertext-blob'));
    if (!path) throw new Error('decrypt missing --ciphertext-blob');
    const content = await readFile(path);
    return { Plaintext: content.toString('base64'), KeyId: 'diag-key-id' };
  }
  if (args[0] === 'kms' && args[1] === 'schedule-key-deletion') {
    return { DeletionDate: new Date().toISOString(), KeyId: argValue(args, '--key-id') };
  }
  return {};
};

describe('GET /api/diagnostics/kms', () => {
  it('runs the full create → encrypt → decrypt → schedule-deletion sequence', async () => {
    const { app, awsCli } = buildTestApp(kmsRoundTripResponder);

    const response = await request(app).get('/api/diagnostics/kms');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.matches).toBe(true);
    expect(response.body.keyId).toBe('diag-key-id');
    expect(response.body.plaintext).toMatch(/^floci-kms-diag-/);
    expect(response.body.decrypted).toBe(response.body.plaintext);

    expect(response.body.steps.map((step: { name: string }) => step.name)).toEqual([
      'create-key',
      'encrypt',
      'decrypt',
    ]);
    for (const step of response.body.steps) {
      expect(step.ok).toBe(true);
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
    }

    expect(response.body.cleanup.ok).toBe(true);

    // Verify the exact CLI sequence and that cleanup ran with --pending-window-in-days.
    const subcommands = awsCli.calls.map(call => `${call[0]} ${call[1]}`);
    expect(subcommands).toEqual([
      'kms create-key',
      'kms encrypt',
      'kms decrypt',
      'kms schedule-key-deletion',
    ]);

    const deletion = awsCli.calls[3];
    expect(deletion).toContain('--key-id');
    expect(deletion).toContain('diag-key-id');
    expect(deletion).toContain('--pending-window-in-days');
    expect(deletion).toContain('7');
  });

  it('flags matches=false when the decrypted blob differs from the original', async () => {
    const responder = async (args: string[]): Promise<unknown> => {
      if (args[0] === 'kms' && args[1] === 'create-key') {
        return { KeyMetadata: { KeyId: 'k' } };
      }
      if (args[0] === 'kms' && args[1] === 'encrypt') {
        return { CiphertextBlob: Buffer.from('opaque').toString('base64') };
      }
      if (args[0] === 'kms' && args[1] === 'decrypt') {
        // Return a base64 of a DIFFERENT plaintext to simulate a corruption.
        return { Plaintext: Buffer.from('something-else').toString('base64') };
      }
      return {};
    };
    const { app } = buildTestApp(responder);

    const response = await request(app).get('/api/diagnostics/kms');

    expect(response.status).toBe(502);
    expect(response.body.ok).toBe(false);
    expect(response.body.matches).toBe(false);
    expect(response.body.decrypted).toBe('something-else');
  });

  it('captures failures per-step when CreateKey fails', async () => {
    const responder = (args: string[]) => {
      if (args[0] === 'kms' && args[1] === 'create-key') {
        throw new Error('AccessDeniedException: kms:CreateKey not allowed');
      }
      return {};
    };
    const { app } = buildTestApp(responder);

    const response = await request(app).get('/api/diagnostics/kms');

    expect(response.status).toBe(502);
    expect(response.body.ok).toBe(false);
    expect(response.body.matches).toBe(false);
    expect(response.body.keyId).toBeUndefined();
    expect(response.body.steps).toHaveLength(1);
    expect(response.body.steps[0].name).toBe('create-key');
    expect(response.body.steps[0].ok).toBe(false);
    expect(response.body.steps[0].error).toMatch(/AccessDenied/);
    // Cleanup must skip schedule-key-deletion when no key was created.
    expect(response.body.cleanup.ok).toBe(true);
  });

  it('reports cleanup failures without masking the round-trip result', async () => {
    const responder = async (args: string[]): Promise<unknown> => {
      if (args[0] === 'kms' && args[1] === 'create-key') {
        return { KeyMetadata: { KeyId: 'k' } };
      }
      if (args[0] === 'kms' && args[1] === 'encrypt') {
        const path = filePath(argValue(args, '--plaintext'));
        if (!path) throw new Error('missing path');
        const content = await readFile(path);
        return { CiphertextBlob: content.toString('base64') };
      }
      if (args[0] === 'kms' && args[1] === 'decrypt') {
        const path = filePath(argValue(args, '--ciphertext-blob'));
        if (!path) throw new Error('missing path');
        const content = await readFile(path);
        return { Plaintext: content.toString('base64') };
      }
      if (args[0] === 'kms' && args[1] === 'schedule-key-deletion') {
        throw new Error('Floci does not implement schedule-key-deletion yet');
      }
      return {};
    };
    const { app } = buildTestApp(responder);

    const response = await request(app).get('/api/diagnostics/kms');

    expect(response.status).toBe(200); // round-trip itself worked
    expect(response.body.ok).toBe(true);
    expect(response.body.matches).toBe(true);
    expect(response.body.cleanup.ok).toBe(false);
    expect(response.body.cleanup.error).toMatch(/schedule-key-deletion/);
  });
});
