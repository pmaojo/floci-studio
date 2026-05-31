---
title: Extensibility & Plugin SDK
description: Lifecycle webhooks, programmable HTTP interceptors and the community plugin SDK.
---

Floci is designed to be extended. Three mechanisms let you hook into the engine,
shape traffic and add new capabilities without forking the core.

## Lifecycle webhooks

Register URLs that receive a `POST` whenever a lifecycle event fires (e.g.
`floci.resource.created`). Events are matched against each webhook's glob pattern
(`*` matches everything), so you can wire Floci into notification tools or other AI
agents in your dev environment.

```
POST /api/extensibility/webhooks
{ "event": "floci.resource.created", "url": "https://hooks.example/floci" }
```

The delivered body is `{ "event", "payload", "timestamp" }`. You can also fire an
event manually for testing via `POST /api/extensibility/webhooks/emit`.

## HTTP interceptors

Declarative rules that modify requests/responses flowing through the **Studio
proxy** (`/api/studio/client/proxy`) — the interception point Floci controls. They
are declarative on purpose (no arbitrary code execution) to keep the local
environment safe by default.

| Action | Params | Effect |
|---|---|---|
| `set_header` | `{ "X-Foo": "bar" }` | Inject/override headers |
| `set_status` | `{ "status": 503 }` | Force a response status |
| `delay_ms` | `{ "ms": 3000 }` | Add artificial latency |

Each rule targets a `url_pattern` (substring or glob) and a `phase`
(`request` or `response`).

## Plugin SDK

Add adapters for less-common AWS services or proprietary tooling as community
plugins. A plugin is a directory under `mcp/plugins/<name>/`:

```
mcp/plugins/my_plugin/
├── plugin.json      # { name, version, description, author, tools: [...] }
└── tools.py         # def register(mcp): ...
```

`tools.py` exposes a `register(mcp)` function that registers MCP tools, exactly
like the core tool modules. The MCP server discovers and loads every plugin at
startup; the backend exposes the catalog at `GET /api/extensibility/plugins`. See
the bundled `example_hello` plugin for a minimal template.

| Layer | Entry point |
|---|---|
| GUI | `/studio/extensibility` |
| REST | `…/webhooks`, `…/webhooks/emit`, `…/interceptors`, `…/plugins` under `/api/extensibility` |
| MCP | `register_lifecycle_webhook`, `emit_lifecycle_event`, `register_http_interceptor`, `list_floci_plugins`, … |
