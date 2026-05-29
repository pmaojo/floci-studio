---
title: Connect Claude / Cursor
description: Add the floci.io MCP server to Claude Desktop or Cursor in 2 minutes.
---

## Prerequisites

- floci.io stack running (`docker compose up` or native)
- [uv](https://docs.astral.sh/uv/) installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`)

## Claude Desktop

Open your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the `floci` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "floci": {
      "command": "uv",
      "args": [
        "run",
        "--project",
        "/path/to/floci-studio/mcp",
        "python",
        "/path/to/floci-studio/mcp/floci_mcp.py"
      ],
      "env": {
        "SIDECAR_TOKEN": "open",
        "AWS_ENDPOINT_URL": "http://127.0.0.1:4566"
      }
    }
  }
}
```

Replace `/path/to/floci-studio` with the absolute path to your clone.

Restart Claude Desktop. The floci server appears in the MCP panel (hammer icon).

## Cursor

Open Cursor Settings → MCP → Add Server:

```json
{
  "floci": {
    "command": "uv",
    "args": [
      "run", "--project", "/path/to/floci-studio/mcp",
      "python", "/path/to/floci-studio/mcp/floci_mcp.py"
    ],
    "env": {
      "SIDECAR_TOKEN": "open",
      "AWS_ENDPOINT_URL": "http://127.0.0.1:4566"
    }
  }
}
```

## Docker (no Python/uv required)

If you prefer not to install Python locally, run the MCP server as a Docker container:

```bash
docker build -t floci-mcp /path/to/floci-studio/mcp/

# Claude Desktop config
{
  "mcpServers": {
    "floci": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "AWS_ENDPOINT_URL=http://host.docker.internal:4566",
        "-e", "SIDECAR_TOKEN=open",
        "floci-mcp"
      ]
    }
  }
}
```

## Verifying the connection

In Claude Desktop, open a new conversation and type:

> "List all SQS queues in floci"

You should see the agent call `list_sqs_queues` and return the queue list (or an empty array if none exist yet).

## Troubleshooting

**"Server disconnected" or no tools appear**
- Make sure `uv` is on your PATH. Run `uv --version` in a terminal.
- Check the absolute path in `args` is correct.
- Restart Claude Desktop fully after editing the config.

**"Connection refused" on AWS calls**
- Confirm floci engine is running: `curl http://localhost:4566/_localstack/health`
- If using Docker transport, the endpoint must be `host.docker.internal:4566`, not `localhost:4566`.

**Wrong `AWS_ENDPOINT_URL`**
- The sidecar and MCP server both use `AWS_ENDPOINT_URL`. Make sure it points to where the engine is listening.
