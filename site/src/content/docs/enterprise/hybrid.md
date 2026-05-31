---
title: Hybrid Development
description: Bridge local and real AWS — cloud data seeding, live SQS proxying and reverse tunnels.
---

Hybrid development connects your local environment to real AWS resources or to the
public internet. These features need **real AWS credentials** (for seeding/proxy)
or a **tunnel binary** (`cloudflared` / `ngrok`) on the host. When prerequisites
are missing, the endpoints degrade with a clear message instead of failing opaquely.

## Data seeding from the cloud

Pull a realistic, anonymized dataset out of a production/staging DynamoDB table and
load it into the local emulator — no manual seeding scripts.

- Scans up to `limit` items from a **real** DynamoDB table.
- Anonymizes sensitive fields on the fly (email, name, phone, address auto-detected,
  or pass `anonymize_fields` to target specific attributes).
- Writes the anonymized records into the local emulator table.

```
POST /api/hybrid/seed-from-cloud
{ "source_table": "prod-users", "target_table": "users", "limit": 25 }
```

## Live cloud proxying

Route live traffic from a real AWS resource directly to a function running locally
for an immediate feedback loop.

- Drains messages from a **real** SQS queue (e.g. a staging queue fed by an SNS topic).
- Forwards each message to a local `lambda`, `sqs` or `sns` target.
- Optionally deletes drained messages from the source queue.

```
POST /api/hybrid/cloud-proxy/sqs
{ "source_queue_url": "https://sqs…/staging-events", "target_type": "lambda", "target": "my-fn" }
```

## Reverse tunnels

Expose a local port (e.g. your API Gateway on `4566`) to the internet with a
temporary public URL — perfect for testing third-party webhooks from Stripe or
GitHub.

- Uses `cloudflared` or `ngrok` if installed; returns the captured public URL.
- Manage running tunnels (list / stop) from the cockpit.

| Layer | Entry point |
|---|---|
| GUI | `/studio/hybrid` |
| REST | `POST /api/hybrid/seed-from-cloud`, `POST /api/hybrid/cloud-proxy/sqs`, `GET/POST /api/hybrid/tunnels`, `DELETE /api/hybrid/tunnels/{pid}` |
| MCP | `seed_from_cloud_dynamodb`, `proxy_cloud_sqs_to_local`, `start_reverse_tunnel`, `list_reverse_tunnels`, `stop_reverse_tunnel` |
