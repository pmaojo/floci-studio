---
title: Extensibility & Plugin SDK
description: Wire Floci into your dev environment with lifecycle webhooks, programmable HTTP interceptors, and community plugins that add new MCP tools.
---

Floci exposes three extension points that let you react to emulator activity,
shape outbound traffic, and ship custom MCP tools — all without touching the
core.

---

## Lifecycle webhooks

A webhook is a URL you register once. Every time Floci fires a matching event,
it POSTs a JSON payload to that URL within a 5-second timeout.

### What events are available?

Any string is a valid event name. Floci currently fires events from the
pipeline and marketplace actions (e.g. `floci.resource.created`). You can
also fire your own events manually with the **emit** endpoint — useful for
testing integrations or signalling other agents.

Events are matched against each webhook's pattern using shell-style glob
matching, so `*` catches everything and `floci.resource.*` catches every
resource event.

### Registering a webhook

```http
POST /api/extensibility/webhooks
Content-Type: application/json

{
  "event": "floci.resource.created",
  "url": "https://hooks.slack.com/services/T.../B.../...",
  "description": "Notify #dev-infra when a new resource appears"
}
```

Or via Claude / Cursor:

```
You: Notify https://hooks.example/floci whenever any Floci event fires
Claude: [calls register_lifecycle_webhook(event="*", url="https://hooks.example/floci")]
```

### Delivery body

Every request Floci sends to your URL has the same shape:

```json
{
  "event": "floci.resource.created",
  "payload": { ... },
  "timestamp": 1748700000.123
}
```

The webhook record also tracks `lastDelivery` — the HTTP status (or error) from
the most recent delivery — visible in the **Extensibility** panel.

### Testing a webhook manually

```http
POST /api/extensibility/webhooks/emit
Content-Type: application/json

{
  "event": "floci.deploy.finished",
  "payload": { "recipeId": "postgres", "env": "test" }
}
```

This fires the event immediately to all webhooks whose pattern matches
`floci.deploy.finished`, and returns a delivery report:

```json
{
  "event": "floci.deploy.finished",
  "delivered": [
    { "webhookId": "...", "url": "https://...", "status": 200 }
  ],
  "count": 1
}
```

### Use cases

- **Slack / Teams alerts** — fire a Slack webhook when a deployment finishes or
  a DLQ message lands.
- **AI agent handoffs** — signal a second Claude session to start running tests
  after `floci.deploy.finished`.
- **Log to a file** — point at a tiny local HTTP server (e.g. `python -m http.server`)
  to capture every emulator event during a debugging session.
- **Trigger CI** — call a GitHub Actions workflow_dispatch endpoint so the CI
  pipeline starts as soon as the local stack is ready.

---

## HTTP interceptors

Interceptors are declarative rules that modify traffic flowing through the
**Studio proxy** (`/api/studio/client/proxy`). They apply before a request
leaves Floci (`request` phase) or before the response is returned to the
caller (`response` phase).

They are intentionally declarative — no arbitrary code, no eval — so the
local environment stays safe by default.

### Rule structure

Each rule matches URLs by **substring or glob** against `url_pattern`:

| Field | Values | Description |
|---|---|---|
| `url_pattern` | any string or glob | Substring check first, then `fnmatch` glob |
| `phase` | `request` · `response` | When the rule fires |
| `action` | `set_header` · `set_status` · `delay_ms` | What to do |
| `params` | depends on action | Action parameters |

### Actions

**`set_header`** — inject or override a header on the matching request or
response. Useful for adding auth tokens or CORS headers your app needs during
local development.

```http
POST /api/extensibility/interceptors
{
  "url_pattern": "*/api/orders*",
  "phase": "request",
  "action": "set_header",
  "params": { "X-Internal-Token": "dev-secret" }
}
```

**`set_status`** — force a specific HTTP status code on the response. Use this
to simulate service failures without touching your application code.

```http
POST /api/extensibility/interceptors
{
  "url_pattern": "*/payments*",
  "phase": "response",
  "action": "set_status",
  "params": { "status": 503 }
}
```

**`delay_ms`** — add artificial latency before the response is returned.
Replicate high-latency network conditions or expose race conditions that only
appear under load.

```http
POST /api/extensibility/interceptors
{
  "url_pattern": "*/search*",
  "phase": "response",
  "action": "delay_ms",
  "params": { "ms": 3000 }
}
```

### Use cases

| Scenario | Rule |
|---|---|
| Add a JWT to every outbound request | `set_header` on `request`, pattern `*` |
| Test circuit-breaker logic | `set_status: 503` on `response`, pattern `*/downstream-service*` |
| Verify timeout handling | `delay_ms: 5000` on `response`, pattern `*/slow-endpoint*` |
| Block calls to a third-party API | `set_status: 401` on `response`, pattern `*/stripe.com*` |
| Inject a CORS header for a local UI | `set_header` on `response`, `Access-Control-Allow-Origin: *` |

Rules are stored in `state/lifecycle.json` and survive restarts. Delete a rule
by its `id` when you're done:

```http
DELETE /api/extensibility/interceptors/{id}
```

---

## Plugin SDK

Plugins let you ship new MCP tools for services Floci doesn't cover — a
proprietary internal API, a niche AWS service, or a wrapper around a CLI tool
— without touching the Floci codebase.

### Directory layout

Drop a folder inside `mcp/plugins/`:

```
mcp/plugins/
└── my_plugin/
    ├── plugin.json   ← manifest
    └── tools.py      ← MCP tool registrations
```

The MCP server discovers every `plugin.json` at startup and loads the matching
`tools.py`. The backend exposes the full catalog at
`GET /api/extensibility/plugins`.

### `plugin.json`

```json
{
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Adds tools for the Acme internal API.",
  "author": "you@acme.com",
  "tools": ["acme_list_services", "acme_deploy"]
}
```

### `tools.py`

The only requirement is a top-level `register(mcp)` function. Inside it you
define tools exactly like the Floci core modules do:

```python
def register(mcp):

    @mcp.tool()
    async def acme_list_services() -> dict:
        """List services registered in the Acme internal registry."""
        import httpx
        async with httpx.AsyncClient() as client:
            r = await client.get("http://localhost:9999/services")
            return r.json()

    @mcp.tool()
    async def acme_deploy(service: str, env: str = "staging") -> dict:
        """Deploy a service to the Acme internal cluster."""
        import httpx
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "http://localhost:9999/deploy",
                json={"service": service, "env": env},
            )
            return r.json()
```

Tools registered this way appear in Claude / Cursor exactly like native Floci
tools.

### Overriding the plugins directory

Set `FLOCI_PLUGINS_DIR` to load plugins from a different path — useful for
monorepos where plugins live outside the `mcp/` tree:

```bash
FLOCI_PLUGINS_DIR=/workspace/floci-plugins uv run --project mcp python mcp/floci_mcp.py
```

### Bundled example

`mcp/plugins/example_hello/` is a minimal working plugin you can copy as a
template. It registers one tool, `floci_hello`, that accepts a name and returns
a greeting.

```
You: Say hello to Alice using the Floci plugin
Claude: [calls floci_hello(name="Alice")]
→ { "message": "Hello, Alice! — from the example_hello plugin." }
```

---

## Quick reference

| Layer | Endpoint / Tool |
|---|---|
| **GUI** | Studio → Extensibility |
| **Webhooks REST** | `GET/POST /api/extensibility/webhooks` · `DELETE …/{id}` · `POST …/emit` |
| **Interceptors REST** | `GET/POST /api/extensibility/interceptors` · `DELETE …/{id}` |
| **Plugins REST** | `GET /api/extensibility/plugins` |
| **MCP — webhooks** | `list_lifecycle_webhooks` · `register_lifecycle_webhook` · `delete_lifecycle_webhook` · `emit_lifecycle_event` |
| **MCP — interceptors** | `list_http_interceptors` · `register_http_interceptor` · `delete_http_interceptor` |
| **MCP — plugins** | `list_floci_plugins` |
| **State file** | `state/lifecycle.json` |
| **Plugins dir** | `mcp/plugins/` (override with `FLOCI_PLUGINS_DIR`) |
