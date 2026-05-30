---
title: Local-to-AWS Parity
description: Every marketplace recipe maps to a managed AWS service, so what you test locally behaves the same in production.
---

The whole point of the Floci emulator is **parity**: build and test against AWS APIs locally, then deploy to the real managed services with no surprises. Every marketplace recipe is tagged with the AWS service it targets, a parity note, and the one step to switch from local to production.

You can see this on each recipe card in the Marketplace (the **"Deploys to …"** badge), in each recipe's `README.md` under **Path to AWS**, and in the machine-readable `aws` block of every `recipe.json` — which the MCP server exposes so your AI agent can guide the migration.

## Two kinds of parity

**1. AWS-SDK clients wired straight to Floci.** A few recipes are AWS tools pointed at the emulator on `4566`, so what you browse locally *is* the emulator's state:

| Recipe | Wired to | In production |
|---|---|---|
| `dynamodb-admin` | Floci DynamoDB (`4566`) | Amazon DynamoDB console |
| `s3-admin` | Floci S3 (`4566`) | Amazon S3 console |

Switch them to production by repointing their endpoint variable (`DYNAMO_ENDPOINT` / `S3_ENDPOINT`) at a real regional endpoint — or removing it.

**2. Engine-compatible stand-ins.** Most recipes run the *same engine* AWS manages, so your app code, drivers and wire protocol are identical locally and in the cloud. Moving to production is a connection-string swap, not a rewrite.

## Recipe → managed AWS service

| Recipe | Managed AWS service | How you switch |
|---|---|---|
| PostgreSQL | Amazon RDS for PostgreSQL / Aurora | Repoint the connection string |
| Redis | Amazon ElastiCache for Redis | Point `REDIS_URL` at the cluster endpoint |
| MongoDB | Amazon DocumentDB | Repoint the connection string (+ RDS CA) |
| ClickHouse | Self-host on ECS/EKS (alt: Redshift) | Run the image on ECS, attach a volume |
| RabbitMQ | Amazon MQ for RabbitMQ | Swap the AMQP connection URI |
| NATS JetStream | Amazon SNS + SQS (or Amazon MQ) | Map subjects→SNS, consumers→SQS |
| Redpanda | Amazon MSK (Kafka) | Point bootstrap servers at MSK |
| MinIO | Amazon S3 | Drop the custom endpoint from the SDK |
| Meilisearch | Amazon OpenSearch Service | Migrate the index / self-host on ECS |
| Qdrant | OpenSearch Serverless (vector) / pgvector | Recreate the collection, repoint client |
| Keycloak | Amazon Cognito | Swap the OIDC issuer/JWKS URL |
| Vault | AWS Secrets Manager + KMS | Migrate secrets, swap the SDK |
| Mailpit | Amazon SES | Point SMTP at the SES relay |
| Ollama | Amazon Bedrock | Swap the base URL/SDK to Bedrock Runtime |
| Temporal | Self-host on EKS (alt: Step Functions) | Run on EKS with RDS persistence |
| n8n | Self-host on Amazon ECS/EKS | Run on ECS with EFS + RDS |
| Jaeger | AWS X-Ray (via ADOT) | Export OTLP to the ADOT collector |
| Grafana + Prometheus | Managed Grafana + AMP | Remote-write to AMP, import dashboards |
| Nginx Proxy Manager | AWS ALB + ACM | Recreate hosts as ALB rules |
| PocketBase | Self-host on ECS/Fargate | Run on Fargate with an EFS volume |
| Portainer | Amazon ECS / EKS console | Push to ECR, define ECS/EKS workloads |
| IoT Core (MQTT) | AWS IoT Core | Repoint MQTT clients at the ATS endpoint |
| Transfer Family (SFTP) | AWS Transfer Family | Provision a Transfer Family SFTP server |
| DynamoDB Admin | Amazon DynamoDB | Repoint `DYNAMO_ENDPOINT` at the region |
| S3 Admin | Amazon S3 | Repoint `S3_ENDPOINT` at the region |

> 💡 Pair this with the [production paths in the README](https://github.com/pmaojo/floci-studio#-from-floci-studio-to-real-amazon-aws-how-to-go-to-production) (AWS Copilot, Terraform/CDK, SAM) to ship the whole stack.
