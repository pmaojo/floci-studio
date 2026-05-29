---
title: Installation
description: Full installation guide for Floci Studio — Docker, MCP server, and development setup.
---

## Docker (recommended)

The easiest way to run Floci Studio is via Docker Compose. Everything runs in containers — no local Python or Node.js required.

```bash
git clone https://github.com/pmaojo/floci-studio
cd floci-studio
docker compose up
```

Services start on:
| Service | Port | Description |
|---|---|---|
| floci-engine | 4566 | AWS-compatible API endpoint |
| floci-sidecar | 8000 | FastAPI backend |
| floci-studio | 3000 | React GUI |

## Building from source

If you want to run the frontend in dev mode (hot reload):

### Prerequisites

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- Python 3.11+ and [uv](https://docs.astral.sh/uv/)

```bash
# Install frontend dependencies
pnpm install

# Start the Vite dev server
pnpm dev
```

The UI will be at `http://localhost:5173` and will proxy API calls to the sidecar on `:8000`.

### Running the sidecar locally

```bash
cd mcp
uv sync
uv run python floci_backend/main.py
```

## MCP server

The MCP server is a separate process your AI agent connects to via stdio.

### With uv (recommended)

```bash
uv run --project mcp python mcp/floci_mcp.py
```

### With Docker

```bash
docker build -t floci-mcp mcp/
docker run -i --rm \
  -e AWS_ENDPOINT_URL=http://host.docker.internal:4566 \
  -e SIDECAR_TOKEN=open \
  floci-mcp
```

## Verifying the installation

Run this to confirm the emulator is up:

```bash
curl http://localhost:4566/_localstack/health | python3 -m json.tool
```

You should see a JSON response with service statuses. The floci cockpit shows a green indicator in the bottom-left when healthy.
