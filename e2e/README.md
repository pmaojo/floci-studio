# Floci Studio — End-to-End GUI harness

A reproducible, full-stack end-to-end setup that boots the three Floci services,
seeds a realistic AWS dataset, drives the real React cockpit with Playwright, and
captures the documentation screenshots from the same run that asserts the data.

Everything here is tidy and self-contained — nothing in this folder is required
for the app to run; it's the test/demo rig.

## Files

| File | Purpose |
|---|---|
| `run.sh` | Orchestrator: `up` / `test` / `down`. |
| `emulator.py` | AWS-compatible API on `:4566` (moto-backed), with the LocalStack-style `/_localstack/health` route the GUI polls. Stands in for the `floci/floci` engine image when it can't be pulled. |
| `seed.py` | Seeds realistic, deterministic resources across ~18 services via `boto3`. |
| `requirements.txt` | Python deps for the harness (installed into `e2e/.venv`). |
| `screenshots/` | Scratch output (git-ignored). The published screenshots live in `site/src/assets/gui/`. |

The Playwright specs live in [`../.playwright-mcp/`](../.playwright-mcp/):
`gui-tour.spec.ts` (the screenshot tour) plus the focused `dashboard`, `kms`,
and `marketplace` specs.

## Quick start

```bash
# from the repo root
pnpm exec playwright install chromium   # once — Playwright's own browser
e2e/run.sh up                           # emulator + sidecar + GUI, seeded
e2e/run.sh test                         # run the tour, capture screenshots
e2e/run.sh down                         # stop everything
```

Open http://localhost:3000 after `up` to click around the seeded cockpit.

## Architecture

```
┌──────────────┐   /aws    ┌────────────────────┐
│ Vite GUI     │──────────▶│ emulator :4566     │  AWS-compatible API
│ :3000        │ /sidecar  │ (Floci engine, or  │
└──────┬───────┘─────┐     │  a moto stand-in)  │
       │             │     └────────────────────┘
       ▼             ▼               ▲
   browser     ┌───────────┐  boto3  │
               │ sidecar   │─────────┘
               │ :8000     │  / aws-cli
               └───────────┘
```

- The GUI reaches the emulator through the Vite `/aws` proxy
  (`FLOCI_PROXY_TARGET`) and the sidecar through `/sidecar`
  (`SIDECAR_PROXY_TARGET`).
- Browser-direct views use the AWS SDK; a few (e.g. EC2 inventory) read through
  the sidecar's `aws-cli` connector.

## Running against the real Floci engine

The harness defaults to the moto stand-in only because some CI/sandbox networks
can't pull the engine image. To use the real engine:

```bash
docker compose up floci          # starts the engine on :4566
# then start sidecar + GUI as usual (or skip emulator.py in run.sh)
```

No spec changes are needed — the cockpit speaks standard AWS APIs either way.

## Notes

- `e2e/.venv` is created on first `run.sh up` and is **not** pruned by
  `uv sync --project mcp` (which the web SessionStart hook runs), so the harness
  keeps working across sessions.
- In sandboxes whose pre-baked Chromium differs from the `@playwright/test`
  pinned build, set `PLAYWRIGHT_CHROMIUM_PATH` to its executable. Unset in CI.
