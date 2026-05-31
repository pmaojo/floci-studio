---
title: Marketplace Recipes
description: Deploy supporting services like Postgres, Redis, Temporal, and NATS with one click.
---

The Floci Studio Marketplace lets you spin up any supporting service your stack needs — databases, message brokers, workflow engines, auth servers — without leaving the cockpit.

## What's a recipe?

Each recipe is a parameterized Docker Compose template. When you deploy, floci:
1. Prompts you to fill in configurable variables (ports, passwords, database names)
2. Writes a `.env` file with your values
3. Runs `docker compose up -d` in the recipe directory
4. Streams the Docker logs until services are healthy

## Deploying a recipe

1. Click **Marketplace** in the sidebar.
2. Browse or search the recipe catalog.
3. Click a recipe card to open the configuration form.
4. Fill in any required variables — or leave defaults.
5. Click **Deploy**.

The event stream shows live Docker logs. Once healthy, an **Access** button appears with a link to the service UI (if it has one).

## Managing deployments

Installed recipes appear in the **Installed** section. From there you can:
- **View logs** — tail recent Docker Compose output
- **Tear down** — stop and remove containers (data volumes are preserved unless you force-delete)

## Available recipes

| Recipe | Default Port | UI |
|---|---|---|
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| MongoDB + Mongo Express | 27017 / 8081 | `localhost:8081` |
| RabbitMQ | 5672 / 15672 | `localhost:15672` |
| Redpanda (Kafka-compatible) | 9092 | `localhost:8080` |
| NATS JetStream | 4222 | `localhost:8222` (monitoring) |
| Temporal + UI | 7233 / 8088 | `localhost:8088` |
| n8n Automation | 5678 | `localhost:5678` |
| Keycloak + PostgreSQL | 8080 | `localhost:8080` |
| Jaeger (Distributed Tracing) | 6831 / 16686 | `localhost:16686` |
| Minio (S3-compatible) | 9000 / 9001 | `localhost:9001` |
| Mailpit (SMTP) | 1025 / 8025 | `localhost:8025` |
| Meilisearch | 7700 | `localhost:7700` |
| Grafana + Prometheus | 9090 / 3001 | `localhost:3001` |
| Nginx Proxy Manager | 80 / 81 | `localhost:81` |
| PocketBase | 8090 | `localhost:8090/_/` |
| IoT Core (MQTT) | 1883 | — |
| AWS Transfer Family (SFTP) | 2222 | — |
| Ollama (Local LLM Runtime) | 11434 | — (OpenAI-compatible API) |
| Qdrant (Vector Database) | 6333 / 6334 | `localhost:6333/dashboard` |
| HashiCorp Vault (Dev Mode) | 8200 | `localhost:8200` |
| ClickHouse (Analytics OLAP DB) | 8123 / 9000 | `localhost:8123/play` |
| Portainer (Docker Cockpit) | 9443 | `localhost:9443` |
| S3 Admin (Floci-wired) | 8002 | `localhost:8002` |
| MySQL + Adminer | 3306 / 8080 | `localhost:8080` |
| Elasticsearch + Kibana | 9200 / 5601 | `localhost:5601` |
| Supabase | 5432 / 3000 | `localhost:3000` |
| Apache Kafka + Kafka UI | 9092 / 8082 | `localhost:8082` |
| Metabase | 3000 | `localhost:3000` |
| Loki + Grafana (Log Aggregation) | 3100 / 3001 | `localhost:3001` |
| Apache Airflow | 8080 | `localhost:8080` |
| Uptime Kuma | 3001 | `localhost:3001` |
| pgAdmin | 5050 | `localhost:5050` |
| Weaviate (Vector Database) | 8080 / 50051 | `localhost:8080` |

> Every recipe maps to a managed AWS service so it deploys cleanly to production — see [Local-to-AWS Parity](/guides/aws-parity/). Recipes like **DynamoDB Admin** and **S3 Admin** are AWS-SDK tools wired straight to the Floci endpoint (`4566`), so you test against the emulator exactly as you would against real AWS.

## Writing a custom recipe

Create a folder under `recipes/<your-recipe>/` with two files:

**`recipe.json`**
```json
{
  "id": "my-service",
  "name": "My Service",
  "description": "Short description shown in the catalog.",
  "version": "1.0.0",
  "accessUrl": "http://localhost:{{MY_PORT}}",
  "variables": [
    {
      "key": "MY_PORT",
      "label": "Port",
      "type": "number",
      "default": 8080,
      "description": "Port to expose the service on."
    }
  ]
}
```

**`docker-compose.yml`**
```yaml
services:
  my-service:
    image: my-image:latest
    ports:
      - "${MY_PORT}:8080"
    restart: unless-stopped
```

Restart the sidecar and your recipe appears in the Marketplace catalog automatically.
