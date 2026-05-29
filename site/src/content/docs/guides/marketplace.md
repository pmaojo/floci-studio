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
