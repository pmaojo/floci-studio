---
title: Marketplace Recipes
description: All 35 Floci Studio marketplace recipes with configurable variables, ports, and access URLs.
---

Each recipe is a parameterized Docker Compose template deployed via the floci Marketplace UI or MCP tools. Every recipe also maps to a managed AWS service for production — see [Local-to-AWS Parity](/guides/aws-parity/).

## Deploy from the UI

Go to **Marketplace** in the sidebar → select a recipe → configure variables → click **Deploy**.

## Deploy via MCP

```
You: Deploy the Postgres recipe with password "mysecret" on port 5433
Claude: [calls deploy_marketplace_app(recipe_id="postgres", variables={"POSTGRES_PASSWORD": "mysecret", "POSTGRES_PORT": "5433"})]
```

---

## DynamoDB Admin

A web-based GUI for browsing, querying, and editing DynamoDB tables. Pre-wired to point at the Floci DynamoDB endpoint (port 4566) out of the box — what you browse locally is the same data you'll see in the **Amazon DynamoDB** console.

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

## S3 Admin

A web GUI to browse, upload and download S3 buckets and objects. Pre-wired to the Floci (LocalStack) S3 endpoint on port 4566 — test S3 workflows locally exactly as they'll run against **Amazon S3**.

| Variable | Default | Description |
|---|---|---|
| `S3_ADMIN_PORT` | `8002` | Host port for the web UI |
| `S3_ENDPOINT` | `host.docker.internal:4566` | S3 endpoint (host:port) to connect to |
| `AWS_REGION` | `us-east-1` | AWS region |

**Access:** `http://localhost:8002`

```
You: Deploy S3 Admin
Claude: [calls deploy_marketplace_app(recipe_id="s3-admin")]
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
| `RABBITMQ_DEFAULT_USER` | `guest` | Username |
| `RABBITMQ_DEFAULT_PASS` | `guest` | Password |

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

---

## Ollama (Local LLM Runtime)

Run open-source LLMs (Llama 3, Mistral, Phi, Gemma…) locally behind an OpenAI-compatible API. Pair it with Qdrant for a fully local RAG stack.

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_PORT` | `11434` | HTTP API port |
| `OLLAMA_KEEP_ALIVE` | `5m` | How long a model stays loaded in memory |

**Access:** `http://localhost:11434` (OpenAI-compatible at `/v1`)

```
You: Deploy Ollama
Claude: [calls deploy_marketplace_app(recipe_id="ollama")]
```

---

## Qdrant (Vector Database)

High-performance vector search for embeddings, semantic search and RAG. Ships with a web dashboard and REST + gRPC APIs.

| Variable | Default | Description |
|---|---|---|
| `QDRANT_HTTP_PORT` | `6333` | REST API + dashboard port |
| `QDRANT_GRPC_PORT` | `6334` | gRPC port |
| `QDRANT_API_KEY` | `qdrant123` | API key (sent in the `api-key` header) |

**Access:** Dashboard at `http://localhost:6333/dashboard`

---

## HashiCorp Vault (Dev Mode)

Secrets management and encryption-as-a-service — a local stand-in for AWS Secrets Manager and SSM Parameter Store.

| Variable | Default | Description |
|---|---|---|
| `VAULT_PORT` | `8200` | HTTP API + UI port |
| `VAULT_DEV_ROOT_TOKEN` | `root` | Root token for the dev server |

**Access:** UI at `http://localhost:8200` (sign in with the root token)

> Dev mode keeps everything in memory — great for local dev, not for production.

---

## ClickHouse (Analytics OLAP DB)

Column-oriented database for real-time analytics over billions of rows, with a built-in web Play console.

| Variable | Default | Description |
|---|---|---|
| `CLICKHOUSE_HTTP_PORT` | `8123` | HTTP interface + Play console port |
| `CLICKHOUSE_NATIVE_PORT` | `9000` | Native TCP protocol port |
| `CLICKHOUSE_USER` | `default` | Database user |
| `CLICKHOUSE_PASSWORD` | `clickhouse123` | Database password |
| `CLICKHOUSE_DB` | `analytics` | Default database created on boot |

**Access:** Play console at `http://localhost:8123/play`

---

## Portainer (Docker Cockpit)

A web UI to manage Docker itself — containers, images, volumes, networks, logs and in-browser shells.

| Variable | Default | Description |
|---|---|---|
| `PORTAINER_PORT` | `9443` | HTTPS web UI port |

**Access:** `https://localhost:9443` (accept the self-signed cert, then create an admin user on first boot)

---

## MySQL + Adminer

The world's most popular open-source relational database, bundled with Adminer — a lightweight web UI for managing databases, tables and queries.

| Variable | Default | Description |
|---|---|---|
| `MYSQL_PORT` | `3306` | Host port for the MySQL server |
| `ADMINER_PORT` | `8080` | Host port for the Adminer web UI |
| `MYSQL_ROOT_PASSWORD` | `root123` | MySQL root superuser password |
| `MYSQL_DATABASE` | `mydb` | Default database created on startup |
| `MYSQL_USER` | `mysql` | Non-root app user username |
| `MYSQL_PASSWORD` | `mysql123` | Non-root app user password |

**Access:** Adminer at `http://localhost:8080` — select **MySQL**, server `mysql`, then log in with your configured credentials.  
Connection string: `mysql://mysql:mysql123@localhost:3306/mydb`

---

## Elasticsearch + Kibana

A distributed, RESTful search and analytics engine with Kibana for building dashboards, running queries and exploring indices.

| Variable | Default | Description |
|---|---|---|
| `ELASTICSEARCH_PORT` | `9200` | Host port for the Elasticsearch HTTP API |
| `KIBANA_PORT` | `5601` | Host port for the Kibana web UI |
| `ELASTIC_PASSWORD` | `elastic123` | Password for the built-in `elastic` superuser |

**Access:** Kibana at `http://localhost:5601` — log in as `elastic` with your configured password.  
REST API: `curl -u elastic:elastic123 http://localhost:9200`

---

## Supabase

An open-source Firebase alternative on PostgreSQL. Includes a managed database, auto-generated REST API via PostgREST and the Supabase Studio dashboard.

| Variable | Default | Description |
|---|---|---|
| `STUDIO_PORT` | `3000` | Host port for Supabase Studio |
| `POSTGRES_PORT` | `5432` | Host port for direct PostgreSQL connections |
| `POSTGRES_PASSWORD` | `supabase123` | PostgreSQL superuser password |
| `JWT_SECRET` | `super-secret-jwt-token-with-at-least-32-characters-long` | Secret for signing JWTs (min 32 chars) |
| `ANON_KEY` | *(dev JWT)* | Public anonymous key for client SDK calls |
| `SERVICE_KEY` | *(dev JWT)* | Private service-role key — bypasses RLS, keep secret |

**Access:** Studio at `http://localhost:3000`  
Direct Postgres: `postgresql://postgres:supabase123@localhost:5432/postgres`

> The default `ANON_KEY` and `SERVICE_KEY` are Supabase's documented local-dev JWTs. Replace them with keys signed by your own `JWT_SECRET` before sharing any environment.

---

## Apache Kafka + Kafka UI

A distributed event streaming platform for data pipelines and real-time analytics, running in KRaft mode (no ZooKeeper). Bundled with Kafka UI for managing topics, consumer groups and messages.

| Variable | Default | Description |
|---|---|---|
| `KAFKA_PORT` | `9092` | Host port for the Kafka broker |
| `KAFKA_UI_PORT` | `8082` | Host port for the Kafka UI web console |

**Access:** Kafka UI at `http://localhost:8082`  
Bootstrap server: `localhost:9092`

```
You: Deploy Kafka
Claude: [calls deploy_marketplace_app(recipe_id="kafka")]
```

---

## Metabase

An open-source BI tool for building charts, dashboards and automated reports. Connects to PostgreSQL, MySQL, MongoDB, ClickHouse and many more.

| Variable | Default | Description |
|---|---|---|
| `METABASE_PORT` | `3000` | Host port for the Metabase web UI |

**Access:** `http://localhost:3000` — follow the setup wizard to connect your first database.

---

## Loki + Grafana (Log Aggregation)

Grafana Loki collects and indexes logs by label — lightweight and fast. Bundled with a Grafana instance pre-configured with Loki as a datasource.

| Variable | Default | Description |
|---|---|---|
| `LOKI_PORT` | `3100` | Host port for the Loki ingestion and query API |
| `GRAFANA_PORT` | `3001` | Host port for the Grafana web UI |
| `GRAFANA_PASSWORD` | `admin123` | Grafana admin password (username: `admin`) |

**Access:** Grafana at `http://localhost:3001` → **Explore** → select the **Loki** datasource.

Push a test log entry:
```bash
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H 'Content-Type: application/json' \
  -d '{"streams":[{"stream":{"app":"test"},"values":[["'$(date +%s%N)'","hello loki"]]}]}'
```

---

## Apache Airflow

Workflow orchestration platform for authoring, scheduling and monitoring data pipelines as Python DAGs. Runs in standalone mode — ideal for local development.

| Variable | Default | Description |
|---|---|---|
| `AIRFLOW_PORT` | `8080` | Host port for the Airflow web UI |
| `AIRFLOW_USERNAME` | `airflow` | Admin account username |
| `AIRFLOW_PASSWORD` | `airflow123` | Admin account password |

**Access:** `http://localhost:8080` — log in with your configured credentials.  
Place DAG files in the `airflow-dags` Docker volume; they are picked up automatically.

---

## Uptime Kuma

Self-hosted uptime monitoring with real-time dashboards, status pages and 90+ notification integrations (Slack, Telegram, PagerDuty, email…).

| Variable | Default | Description |
|---|---|---|
| `UPTIME_KUMA_PORT` | `3001` | Host port for the Uptime Kuma dashboard |

**Access:** `http://localhost:3001` — create an admin account on first launch.

---

## pgAdmin

The most popular open-source PostgreSQL administration platform — schema browser, query tool with execution plans, user management and multi-server support.

| Variable | Default | Description |
|---|---|---|
| `PGADMIN_PORT` | `5050` | Host port for the pgAdmin web UI |
| `PGADMIN_EMAIL` | `admin@local.dev` | Login email address |
| `PGADMIN_PASSWORD` | `pgadmin123` | Login password |

**Access:** `http://localhost:5050` — log in with your configured email and password.

To connect to the Floci `postgres` recipe, add a new server using host `host.docker.internal`, port `5432`.

---

## Weaviate (Vector Database)

An open-source vector database for semantic search, RAG pipelines and AI applications. Stores data objects alongside their embeddings and queries them via REST and gRPC APIs.

| Variable | Default | Description |
|---|---|---|
| `WEAVIATE_PORT` | `8080` | Host port for the REST API and web console |
| `WEAVIATE_GRPC_PORT` | `50051` | Host port for the gRPC API (v4 clients) |

**Access:** REST API at `http://localhost:8080/v1`

```python
import weaviate
client = weaviate.connect_to_local(host="localhost", port=8080, grpc_port=50051)
```
