#!/usr/bin/env node
// Smoke test for the KMS round-trip diagnostic.
// Hits the sidecar at SIDECAR_URL (default http://127.0.0.1:4317) and prints a summary.
// Exit code 0 when ok=true, 1 otherwise. Useful for CI:
//   npm run smoke:kms
//   SIDECAR_URL=http://host:4317 SIDECAR_TOKEN=... npm run smoke:kms

const url = process.env.SIDECAR_URL ?? 'http://127.0.0.1:4317';
const token = process.env.SIDECAR_TOKEN ?? '';
const endpoint = `${url.replace(/\/$/, '')}/api/diagnostics/kms`;

const headers = { 'accept': 'application/json' };
if (token) headers['x-floci-sidecar-token'] = token;

const colors = process.stdout.isTTY ? {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
} : {
  green: (s) => s, red: (s) => s, dim: (s) => s, bold: (s) => s,
};

const mark = (ok) => ok ? colors.green('PASS') : colors.red('FAIL');

const main = async () => {
  let response;
  try {
    response = await fetch(endpoint, { headers });
  } catch (error) {
    console.error(colors.red(`Failed to reach sidecar at ${endpoint}: ${error.message}`));
    console.error(colors.dim('Hint: is `npm run sidecar:dev` running, or is the docker-compose sidecar up?'));
    process.exit(2);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    console.error(colors.red(`Sidecar returned non-JSON (status ${response.status})`));
    process.exit(2);
  }

  console.log(colors.bold(`KMS diagnostic — ${mark(body.ok)} (HTTP ${response.status})`));
  if (body.keyId) console.log(colors.dim(`  keyId:    ${body.keyId}`));
  if (body.plaintext) console.log(colors.dim(`  payload:  ${body.plaintext}`));
  if (body.decrypted !== undefined) {
    console.log(colors.dim(`  decoded:  ${body.decrypted}  (matches=${body.matches})`));
  }

  for (const step of body.steps ?? []) {
    const line = `  ${mark(step.ok)} ${step.name.padEnd(22)} ${String(step.durationMs).padStart(5)}ms`;
    console.log(step.detail ? `${line}  ${colors.dim(step.detail)}` : line);
    if (step.error) console.log(`        ${colors.red(step.error)}`);
  }

  if (body.cleanup) {
    const line = `  ${mark(body.cleanup.ok)} cleanup`;
    console.log(body.cleanup.error ? `${line}                  ${colors.red(body.cleanup.error)}` : line);
  }

  if (body.error) console.log(colors.red(`  fatal: ${body.error}`));

  process.exit(body.ok ? 0 : 1);
};

main();
