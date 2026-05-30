---
title: Quick Start
description: Get Floci Studio running locally in under 2 minutes.
---

Floci Studio is a local AWS emulator cockpit. You get a full-featured GUI, an AWS-compatible API endpoint on `:4566`, and an MCP server your AI agent can drive — all running on your machine, at zero cost.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose v2
- Git

That's it. No AWS account. No Python. No Node.js required just to run.

## 1. Clone the repo

```bash
git clone https://github.com/pmaojo/floci-studio
cd floci-studio
```

## 2. Start the stack

```bash
docker compose up
```

This starts three containers:
- **floci-engine** — the AWS emulator, exposed on `:4566`
- **floci-sidecar** — the FastAPI backend, exposed on `:8000`
- **floci-studio** — the React UI, exposed on `:3000`

First run pulls images and takes ~60 seconds. Subsequent starts are under 5 seconds.

## 3. Open the console

Navigate to **http://localhost:3000** in your browser.

You'll see the floci cockpit. The event stream at the bottom turns green when the emulator is reachable.

## 4. Create your first resource

Click **SQS** in the sidebar, then **Create Queue**. Name it `my-queue` and click Create. Your queue is now live on the local AWS endpoint.

## What's next

- [Installation guide](/getting-started/installation/) — full prerequisites, building from source, MCP setup
- [SQS guide](/guides/sqs/) — send and receive messages
- [MCP server](/mcp/overview/) — connect Claude or Cursor to drive the stack
