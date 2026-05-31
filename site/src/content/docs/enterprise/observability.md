---
title: Observability & Debugging
description: Dead Letter Queue management, time-travel debugging and X-Ray-style service graphs in Floci Studio.
---

Floci Studio brings enterprise-grade distributed-debugging to your local AWS
environment. Everything below works fully offline against the emulator and is
exposed through the cockpit (**Studio Enterprise** in the sidebar), the REST API
and the MCP server.

## Dead Letter Queue (DLQ) management

A dedicated view to monitor failed messages and recover from them.

- **Auto-discovery** — Floci scans every SQS queue's `RedrivePolicy` and lists the
  queues actually used as DLQs, along with the source queue(s) that feed them and
  the current failed-message count.
- **Inspect without consuming** — messages are read with `VisibilityTimeout=0`, so
  inspecting a DLQ never hides messages from other consumers. Each message shows its
  `ApproximateReceiveCount` and originating queue.
- **One-click redrive** — after fixing your code, redrive moves messages back to the
  source queue. Floci only deletes a message from the DLQ once it has been
  successfully re-sent.

| Layer | Entry point |
|---|---|
| GUI | `/studio/dlq` |
| REST | `GET /api/observability/dlq`, `GET /api/observability/dlq/messages`, `POST /api/observability/dlq/redrive` |
| MCP | `list_dead_letter_queues`, `inspect_dlq_messages`, `redrive_dlq` |

## Flight Recorder — time-travel debugging

Intercept an asynchronous event in transit, pause it, inspect and modify its JSON
payload, then resume its journey to the real target.

1. **Hold** an event for `sqs`, `sns`, `eventbridge` or `lambda`.
2. **Edit** the payload JSON in place while it is `held`.
3. **Replay** it — Floci dispatches it to the real target (`SendMessage`,
   `Publish`, `PutEvents` or `Invoke`) and records the result.

Held events live in an in-memory ring buffer on the backend.

| Layer | Entry point |
|---|---|
| GUI | `/studio/flight-recorder` |
| REST | `GET/POST /api/observability/flight-recorder`, `PUT .../{id}`, `POST .../{id}/replay`, `DELETE .../{id}` |
| MCP | `capture_event_for_replay`, `list_captured_events`, `edit_captured_event`, `replay_captured_event` |

## Service graph (X-Ray style)

An interactive Mermaid map that renders the **real** relationships between your
resources — not just an inventory:

- SNS → SQS / Lambda subscriptions
- Lambda event source mappings (SQS, Kinesis, DynamoDB streams)
- EventBridge rules → targets
- SQS → DLQ redrive edges
- S3 event notifications → Lambda / SQS

| Layer | Entry point |
|---|---|
| GUI | `/studio/service-graph` |
| REST | `GET /api/observability/service-graph` |
| MCP | `get_service_graph` |
