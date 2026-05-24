import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const spawnCalls: { command: string; args: string[]; options: unknown }[] = [];

vi.mock('node:child_process', () => ({
  spawn: (command: string, args: string[], options: unknown) => {
    spawnCalls.push({ command, args, options });
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => {
      child.stdout.emit('data', Buffer.from('{}'));
      child.emit('close', 0);
    });
    return child;
  },
}));

// Import after the mock is registered so AwsCli picks up the stub.
const { AwsCli } = await import('../src/infrastructure/awsCli');

describe('AwsCli', () => {
  beforeEach(() => {
    spawnCalls.length = 0;
  });

  it('spawns aws without a shell, with arguments forwarded literally', async () => {
    const cli = new AwsCli();
    const payload = '$(touch /tmp/x); :';
    await cli.runJson(['s3api', 'list-buckets', '--prefix', payload]);

    expect(spawnCalls).toHaveLength(1);
    const call = spawnCalls[0];
    expect(call.command).toBe('aws');
    expect((call.options as { shell?: unknown }).shell).toBe(false);
    expect(call.args).toContain(payload);
    expect(call.args.filter(arg => arg === payload).length).toBe(1);
  });

  it('prepends --endpoint-url for service commands and adds --output json', async () => {
    const cli = new AwsCli();
    await cli.runJson(['s3api', 'list-buckets']);

    const call = spawnCalls[0];
    expect(call.args[0]).toBe('--endpoint-url');
    expect(call.args).toContain('s3api');
    expect(call.args).toContain('list-buckets');
    expect(call.args).toContain('--output');
    expect(call.args).toContain('json');
  });

  it('does not prepend --endpoint-url for --version', async () => {
    const cli = new AwsCli();
    await cli.runJson(['--version']);
    const call = spawnCalls[0];
    expect(call.args[0]).toBe('--version');
    expect(call.args).not.toContain('--endpoint-url');
  });
});
