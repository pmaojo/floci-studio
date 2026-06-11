---
title: End-to-End GUI Tests
description: How the Floci Studio GUI is tested end-to-end against a live, fully-seeded stack — and how the documentation screenshots are generated from a real, passing run.
---

Every screenshot in this **GUI** section is produced by an automated end-to-end
run, not by hand. The harness lives in [`e2e/`](https://github.com/pmaojo/floci-studio/tree/main/e2e)
and is designed to be reproducible on any machine or CI runner.

## What it does

1. Boots the full Floci stack (emulator + sidecar + GUI).
2. Seeds a realistic, deterministic dataset across ~18 AWS services.
3. Drives the real React cockpit with Playwright, asserting the seeded
   resources render in each view.
4. Captures a screenshot of every stop straight into the docs site's asset
   folder (`site/src/assets/gui/`).

Because the screenshots come from the same run that asserts the data, the docs
can never drift from reality — if a view breaks, the test fails and the image
isn't updated.

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

The GUI calls the emulator through the Vite `/aws` proxy and the sidecar through
`/sidecar`, exactly as in production — only the targets are local.

## Running it

```bash
# 1. Install Playwright browsers (once)
pnpm exec playwright install chromium

# 2. Bring the stack up + seed data
e2e/run.sh up

# 3. Run the tour (captures screenshots into site/src/assets/gui/)
e2e/run.sh test

# 4. Tear everything down
e2e/run.sh down
```

`e2e/run.sh test` runs `npx playwright test gui-tour`. The same spec file also
holds focused functional specs (`dashboard`, `kms`, `marketplace`) you can run
individually.

## The seeded dataset

`e2e/seed.py` populates the emulator via `boto3`. Every service is seeded
independently and tolerant of partial support, then it prints a summary:

```
=== Seed summary ===
  ✓ S3               4 buckets, 8 objects
  ✓ DynamoDB         2 tables (floci-users, floci-orders), 8 items
  ✓ SQS              3 queues, 5 messages
  ✓ SNS              3 topics, 3 subscriptions
  ✓ KMS              3 keys with aliases
  ✓ SecretsManager   3 secrets
  ✓ IAM              3 roles, 2 users, 1 policy
  ✓ Lambda           3 functions
  ✓ CloudWatchLogs   2 log groups with events
  ✓ EC2              1 VPC, 1 subnet, 1 SG, 2 instances
  ✓ ECR              3 repositories
  ✓ Kinesis          2 streams
  ✓ SSM              3 parameters
  ✓ EventBridge      2 rules
  ✓ StepFunctions    1 state machine
  ✓ Scheduler        1 schedule
  ✓ SES              3 identities
  ✓ Glue             1 database

18/18 services seeded.
```

## The emulator stand-in

Normally the stack runs the real **Floci engine** container (`floci/floci`) on
`:4566`. In CI or sandboxed environments where that image can't be pulled,
`e2e/emulator.py` serves a drop-in replacement: a real, in-memory
AWS-compatible API backed by [`moto`](https://github.com/getmoto/moto), on the
same port and protocol.

Because the cockpit speaks standard AWS SDK / sigv4, it can't tell the
difference — the same browser-direct calls and the same sidecar `aws-cli`
commands work against either backend. The one thing `moto` doesn't implement is
the LocalStack-style `/_localstack/health` route the GUI polls, so the script
wraps `moto` and answers that route itself.

To run against the real engine instead, just start it (`docker compose up
floci`) and point `FLOCI_PROXY_TARGET` at it — no spec changes needed.

## Browser selection

In sandboxes that ship a pre-baked Chromium with a different build number than
the one `@playwright/test` pins, set `PLAYWRIGHT_CHROMIUM_PATH` to its
executable. When unset (the normal case, including CI), Playwright uses the
browser it manages itself.
