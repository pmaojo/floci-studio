# Floci Studio backend

FastAPI gateway behind the Floci Studio cockpit. It talks to the Floci emulator,
orchestrates the recipe Marketplace with Docker Compose and keeps the cockpit's
state on disk.

```bash
uv sync --project backend
uv run --project backend uvicorn floci_backend.server:app --port 8000 --app-dir backend
```

The MCP server that used to live here is now a separate project:
[floci-mcp-unofficial](https://github.com/pmaojo/floci-mcp-unofficial).
