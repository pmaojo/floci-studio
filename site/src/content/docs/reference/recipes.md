---
title: Marketplace Recipes
description: All 19 Floci Studio marketplace recipes with configurable variables, ports, and access URLs.
---

Each recipe is a parameterized Docker Compose template deployed via the floci Marketplace UI or MCP tools.

## Deploy from the UI

Go to **Marketplace** in the sidebar → select a recipe → configure variables → click **Deploy**.

## Deploy via MCP

```
You: Deploy the Postgres recipe with password "mysecret" on port 5433
Claude: [calls deploy_marketplace_app(recipe_id="postgres", variables={"POSTGRES_PASSWORD": "mysecret", "POSTGRES_PORT": "5433"})]
```

---

## DynamoDB Admin

A web-based GUI for browsing, querying, and editing DynamoDB tables. Pre-wired to point at the Floci DynamoDB endpoint (port 4566) out of the box.

| Variable | Default | Description |
|---|---|---|
| `DYNAMODB_ADMIN_PORT` | `8001` | Host port for the web UI |
| `DYNAMO_ENDPOINT` | `http://host.docker.internal:4566` | DynamoDB endpoint to connect to |
| `AWS_REGION` | `us-east-1` | AWS region |

**Access:** `http://localhost:8001`

```
You: Deploy DynamoDB Admin
Claude: [calls deploy_marketplace_app(recipe_id="dynamodb-admin")]
```

---

## PostgreSQL Database

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_PORT` | `5432` | Host port |
| `POSTGRES_USER` | `postgres` | Superuser username |
| `POSTGRES_PASSWORD` | `postgres123` | Superuser password |
| `POSTGRES_DB` | `postgres` | Default database name |

**Access:** `postgresql://postgres:postgres123@localhost:5432/postgres`

---

## Redis Cache & Broker

| Variable | Default | Description |
|---|---|---|
| `REDIS_PORT` | `6379` | Host port |
| `REDIS_PASSWORD` | `redis123` | Auth password |

**Access:** `redis://:redis123@localhost:6379`

---

## MongoDB + Mongo Express

| Variable | Default | Description |
|---|---|---|
| `MONGO_PORT` | `27017` | MongoDB port |
| `MONGO_EXPRESS_PORT` | `8081` | Web UI port |
| `MONGO_INITDB_ROOT_USERNAME` | `admin` | Root username |
| `MONGO_INITDB_ROOT_PASSWORD` | `mongo123` | Root password |

**Access:** Mongo Express at `http://localhost:8081`

---

## RabbitMQ Broker

| Variable | Default | Description |
|---|---|---|
| `RABBITMQ_PORT` | `5672` | AMQP port |
| `RABBITMQ_MANAGEMENT_PORT` | `15672` | Management UI port |
| `RABBITMQ_USER` | `admin` | Username |
| `RABBITMQ_PASSWORD` | `rabbit123` | Password |

**Access:** Management UI at `http://localhost:15672`

---

## Redpanda (Kafka-compatible)

| Variable | Default | Description |
|---|---|---|
| `REDPANDA_KAFKA_PORT` | `9092` | Kafka API port |
| `REDPANDA_ADMIN_PORT` | `9644` | Admin API port |
| `REDPANDA_CONSOLE_PORT` | `8080` | Redpanda Console UI port |

**Access:** Console at `http://localhost:8080`

---

## NATS JetStream

| Variable | Default | Description |
|---|---|---|
| `NATS_PORT` | `4222` | Client port |
| `NATS_MONITORING_PORT` | `8222` | HTTP monitoring port |

**Access:** Monitoring at `http://localhost:8222`  
JetStream enabled by default. Connect with any NATS client to `nats://localhost:4222`.

---

## Temporal Workflow Engine

| Variable | Default | Description |
|---|---|---|
| `TEMPORAL_PORT` | `7233` | gRPC port |
| `TEMPORAL_UI_PORT` | `8088` | Web UI port |

**Access:** Temporal UI at `http://localhost:8088`  
Uses SQLite backend. Temporal CLI: `temporal --address localhost:7233`.

---

## n8n Workflow Automation

| Variable | Default | Description |
|---|---|---|
| `N8N_PORT` | `5678` | Web interface port |
| `N8N_USER` | `admin` | Basic auth username |
| `N8N_PASSWORD` | `floci2026` | Basic auth password |

**Access:** `http://localhost:5678`

---

## Keycloak (+ PostgreSQL)

| Variable | Default | Description |
|---|---|---|
| `KEYCLOAK_PORT` | `8080` | HTTP port |
| `KEYCLOAK_ADMIN` | `admin` | Admin username |
| `KEYCLOAK_ADMIN_PASSWORD` | `keycloak123` | Admin password |

**Access:** Admin console at `http://localhost:8080/admin`

---

## Jaeger Distributed Tracing

| Variable | Default | Description |
|---|---|---|
| `JAEGER_UI_PORT` | `16686` | Web UI port |
| `JAEGER_OTLP_PORT` | `4317` | OpenTelemetry gRPC port |

**Access:** UI at `http://localhost:16686`

---

## Minio (S3-compatible Storage)

| Variable | Default | Description |
|---|---|---|
| `MINIO_PORT` | `9000` | S3 API port |
| `MINIO_CONSOLE_PORT` | `9001` | Web console port |
| `MINIO_ROOT_USER` | `minioadmin` | Access key |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | Secret key |

**Access:** Console at `http://localhost:9001`  
S3 endpoint: `http://localhost:9000`

---

## Mailpit (SMTP)

| Variable | Default | Description |
|---|---|---|
| `MAILPIT_SMTP_PORT` | `1025` | SMTP port |
| `MAILPIT_UI_PORT` | `8025` | Web UI port |

**Access:** Inbox UI at `http://localhost:8025`  
Configure your app to send to `localhost:1025` with no auth required.

---

## Meilisearch

| Variable | Default | Description |
|---|---|---|
| `MEILISEARCH_PORT` | `7700` | HTTP port |
| `MEILISEARCH_MASTER_KEY` | `meili123` | Master key |

**Access:** `http://localhost:7700`

---

## Grafana + Prometheus (Observability)

| Variable | Default | Description |
|---|---|---|
| `PROMETHEUS_PORT` | `9090` | Prometheus port |
| `GRAFANA_PORT` | `3001` | Grafana port |

**Access:** Grafana at `http://localhost:3001` (admin/admin)  
Prometheus at `http://localhost:9090`

---

## Nginx Proxy Manager

| Variable | Default | Description |
|---|---|---|
| `NPM_HTTP_PORT` | `80` | HTTP proxy port |
| `NPM_HTTPS_PORT` | `443` | HTTPS proxy port |
| `NPM_ADMIN_PORT` | `81` | Admin UI port |

**Access:** Admin at `http://localhost:81` (admin@example.com / changeme)

---

## PocketBase

| Variable | Default | Description |
|---|---|---|
| `POCKETBASE_PORT` | `8090` | HTTP port |

**Access:** Admin UI at `http://localhost:8090/_/`

---

## AWS IoT Core (MQTT)

| Variable | Default | Description |
|---|---|---|
| `MQTT_PORT` | `1883` | MQTT broker port |
| `MQTT_WS_PORT` | `9001` | WebSocket port |

**Access:** Connect any MQTT client to `mqtt://localhost:1883`

---

## AWS Transfer Family (SFTP)

| Variable | Default | Description |
|---|---|---|
| `SFTP_PORT` | `2222` | SFTP port |

**Access:** `sftp://user@localhost:2222`
