---
title: MCP Server Overview
description: How the Floci Studio MCP server works and why it matters for AI-native development.
---

Floci Studio ships with a built-in [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. It exposes **89 tools across 15 service modules**, giving any MCP-compatible AI client full operational control over your local AWS environment.

## What you can do

Once connected, your agent can:

- **Create infrastructure** — queues, topics, buckets, tables, functions, secrets
- **Operate services** — send SQS messages, invoke lambdas, publish SNS events, put S3 objects
- **Read state** — list resources, receive messages, scan DynamoDB, get CloudWatch logs
- **Orchestrate flows** — start Step Functions executions, put EventBridge events, run Athena queries
- **Manage secrets** — create/read/update Secrets Manager and KMS entries
- **Marketplace** — deploy and teardown recipes from conversation (including DynamoDB Admin)
- **Tag resources** — apply, remove, and search tags across all AWS resource types
- **Generate artifacts** — export Terraform, generate architecture Mermaid diagrams, create JWT tokens

## Architecture

```
AI Agent (Claude / Cursor)
        │  JSON-RPC stdio
        ▼
floci MCP Server (Python, FastMCP)
        │  in-memory httpx.ASGITransport
        ├──► FastAPI sidecar (Lambda, Athena, Marketplace)
        │
        │  boto3 direct
        └──► floci engine :4566 (SQS, SNS, S3, DynamoDB, ...)
```

The MCP server is built with [FastMCP](https://github.com/jlowin/fastmcp). Each service module exports a `register(mcp)` function that decorates async functions as tools using `@mcp.tool()`.

## Tool modules

| Module | Tools | Description |
|---|---|---|
| `meta` | 6 | Health checks, service inventory, architecture diagram |
| `lambda_` | 8 | Create, invoke, update, delete functions |
| `sqs` | 8 | Queue CRUD, send/receive/delete/purge messages |
| `sns` | 8 | Topic CRUD, publish, subscribe/unsubscribe |
| `s3` | 8 | Bucket CRUD, object get/put/delete, presigned URLs |
| `dynamodb` | 8 | Table CRUD, put/get/query/scan items |
| `secrets` | 5 | Secrets Manager CRUD |
| `kms` | 5 | Key management, encrypt/decrypt |
| `eventbridge` | 5 | Bus list, put events, rule CRUD |
| `stepfunctions` | 4 | List, start, describe executions |
| `athena` | 3 | Run queries, list databases, query history |
| `ses` | 4 | Verify identities, send emails, quota |
| `marketplace` | 5 | List, deploy, teardown recipes (incl. DynamoDB Admin) |
| `devtools` | 7 | Terraform export, AWS CLI escape hatch, JWT, proxy |
| `tags` | 6 | Tag/untag resources, search by tag, list all tag keys |

## Example agent conversation

> **You:** Create an SQS FIFO queue named "order-events", send three test orders to it, then create a Lambda function in Python that reads from the queue and logs the order IDs.

The agent will:
1. Call `create_sqs_queue(name="order-events", fifo=True)`
2. Call `send_sqs_message(...)` three times
3. Call `create_lambda_function(name="order-processor", runtime="python3.12", ...)`
4. Call `create_event_source_mapping` to wire the queue to the function
5. Call `get_lambda_logs` to show you the output

All in a single conversation turn.

## Next steps

- [Connect Claude or Cursor](/docs/mcp/setup)
- [Full tools reference](/docs/mcp/tools-reference)
