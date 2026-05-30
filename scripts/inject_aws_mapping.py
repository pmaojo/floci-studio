#!/usr/bin/env python3
"""One-shot: inject Local->AWS parity metadata into every recipe.

Adds an `aws` block to each recipe.json (managed service target, local/AWS
parity note, and the switch-to-prod step) and appends a matching "Path to AWS"
section to each README. The `aws` block flows automatically to the Marketplace
UI and the MCP server, since both return the raw recipe.json.
"""
import json
import os

RECIPES_DIR = os.path.join(os.path.dirname(__file__), "..", "recipes")

# id -> (managed AWS service, local/AWS parity note, switch-to-prod step)
MAPPING = {
    "clickhouse": (
        "Self-host on Amazon ECS/EKS (analytics alt: Amazon Redshift)",
        "The exact same ClickHouse engine runs locally and in your ECS/Fargate task — identical SQL, table engines and wire protocol.",
        "Push the image to ECR and run it as an ECS service; attach an EBS/EFS volume for /var/lib/clickhouse.",
    ),
    "dynamodb-admin": (
        "Amazon DynamoDB console",
        "Browses the very same tables locally (via the Floci endpoint on 4566) that you will see in the DynamoDB console — zero schema drift.",
        "Already Floci-wired: set DYNAMO_ENDPOINT to your real regional endpoint (or drop it) to inspect production DynamoDB.",
    ),
    "iotcore": (
        "AWS IoT Core",
        "Publish/subscribe over MQTT locally exactly as devices will against IoT Core — same topics, QoS and payloads.",
        "Repoint your MQTT clients at your AWS IoT Core ATS endpoint and attach IoT policies/certs.",
    ),
    "jaeger": (
        "AWS X-Ray (via OpenTelemetry / ADOT)",
        "Emit OTLP spans locally to Jaeger exactly as you will to X-Ray — same instrumentation, no app changes.",
        "Swap the OTLP exporter target for the AWS Distro for OpenTelemetry (ADOT) collector that ships traces to X-Ray.",
    ),
    "keycloak": (
        "Amazon Cognito",
        "Run the same OIDC / OAuth2 / SAML flows locally that Cognito serves — login, tokens and JWKS all behave identically.",
        "Create a Cognito user pool and swap your app's issuer/JWKS URL for the Cognito hosted UI endpoints.",
    ),
    "mailpit": (
        "Amazon SES",
        "Send over plain SMTP locally (captured by Mailpit) exactly as you will to the SES SMTP endpoint — same MIME, headers and auth.",
        "Verify a domain/identity in SES and point your SMTP host/port/credentials at the SES SMTP relay.",
    ),
    "meilisearch": (
        "Amazon OpenSearch Service (or self-host on ECS)",
        "Index and full-text search locally with the same documents and ranking you will run in production.",
        "Either self-host Meilisearch on ECS behind an ALB, or migrate the index to an Amazon OpenSearch domain.",
    ),
    "minio": (
        "Amazon S3",
        "MinIO speaks the S3 API, so buckets, objects and presigned URLs behave locally exactly as on real S3.",
        "Drop the custom endpoint from your AWS SDK config so the S3 client talks to real Amazon S3.",
    ),
    "mongodb": (
        "Amazon DocumentDB (MongoDB-compatible)",
        "The MongoDB wire protocol you use locally is the same DocumentDB speaks — same drivers, queries and indexes.",
        "Provision a DocumentDB cluster and repoint your connection string (add the RDS CA bundle for TLS).",
    ),
    "n8n": (
        "Self-host on Amazon ECS/EKS",
        "Workflows run identically locally and on ECS; its AWS nodes can target the Floci endpoint (4566) in dev for true parity.",
        "Run the n8n image as an ECS service with an EFS-backed /home/node/.n8n volume and an RDS Postgres backend.",
    ),
    "nats": (
        "Amazon SNS + SQS (or Amazon MQ)",
        "Model pub/sub and durable streams locally with JetStream exactly as you will fan out via SNS and queue via SQS.",
        "Map subjects to SNS topics and durable consumers to SQS queues, or migrate to Amazon MQ for a managed broker.",
    ),
    "nginx-proxy-manager": (
        "AWS Application Load Balancer + ACM",
        "Terminate TLS and route hosts/paths locally exactly as an ALB + ACM certificate will in production.",
        "Recreate the proxy hosts as ALB listener rules/target groups and issue the cert in ACM.",
    ),
    "observability": (
        "Amazon Managed Grafana + Amazon Managed Service for Prometheus",
        "The same Prometheus scrape config and Grafana dashboards you build locally run unchanged on the AWS-managed pair.",
        "Remote-write metrics to an AMP workspace and import the dashboards into Amazon Managed Grafana.",
    ),
    "ollama": (
        "Amazon Bedrock",
        "Develop against an OpenAI-compatible chat/embeddings API locally, then call Bedrock's managed models with the same request shape.",
        "Swap the base URL/SDK for the Bedrock Runtime API (or host the model on SageMaker) — your prompt code stays the same.",
    ),
    "pocketbase": (
        "Self-host on Amazon ECS/Fargate",
        "The single PocketBase binary runs the same locally and on Fargate — identical REST API, auth and admin UI.",
        "Run the image as a Fargate service with an EFS volume mounted at /pb_data so the SQLite store persists.",
    ),
    "portainer": (
        "Amazon ECS / EKS console",
        "Manage the very containers locally that you will run as ECS tasks or EKS pods — same images, same compose topology.",
        "Push images to ECR and define the services as an ECS task definition or EKS deployment.",
    ),
    "postgres": (
        "Amazon RDS for PostgreSQL (or Aurora)",
        "The same Postgres engine version runs locally and on RDS — identical SQL, extensions and wire protocol.",
        "Provision an RDS/Aurora PostgreSQL instance and repoint your connection string; no app changes required.",
    ),
    "qdrant": (
        "Amazon OpenSearch Serverless (vector) or Aurora pgvector",
        "Build and query vector collections locally exactly as you will against a managed vector store in production.",
        "Recreate the collection on an OpenSearch Serverless vector index (or Aurora pgvector) and repoint the client.",
    ),
    "rabbitmq": (
        "Amazon MQ for RabbitMQ",
        "Amazon MQ runs upstream RabbitMQ, so exchanges, queues and AMQP behavior are identical to local.",
        "Create an Amazon MQ for RabbitMQ broker and swap the AMQP connection URI — your topology carries over.",
    ),
    "redis": (
        "Amazon ElastiCache for Redis (or MemoryDB)",
        "The same Redis engine and RESP protocol run locally and on ElastiCache — identical commands and data structures.",
        "Provision an ElastiCache for Redis cluster and point REDIS_URL at its primary endpoint.",
    ),
    "redpanda": (
        "Amazon MSK (managed Apache Kafka)",
        "Redpanda is Kafka-API compatible, so producers/consumers and topics behave locally exactly as on MSK.",
        "Point your Kafka bootstrap servers at the MSK cluster endpoint (add the IAM/TLS auth config).",
    ),
    "temporal": (
        "Self-host on Amazon EKS (orchestration alt: AWS Step Functions)",
        "The same Temporal SDK workflows and activities run locally and on your cluster — identical determinism and history.",
        "Run the Temporal services on EKS with an RDS persistence store, or model the flow as an AWS Step Functions state machine.",
    ),
    "transfer": (
        "AWS Transfer Family (SFTP)",
        "Move files over SFTP locally exactly as clients will against a Transfer Family server — same protocol and auth.",
        "Provision an AWS Transfer Family SFTP server backed by an S3 bucket and migrate the users.",
    ),
    "vault": (
        "AWS Secrets Manager + KMS",
        "Read/write secrets locally through Vault's API exactly as you will via Secrets Manager — same get/put lifecycle.",
        "Migrate the KV secrets into AWS Secrets Manager and swap the SDK; use KMS for the encryption keys.",
    ),
}


def main() -> None:
    for rid, (service, parity, deploy) in MAPPING.items():
        rdir = os.path.join(RECIPES_DIR, rid)
        rjson = os.path.join(rdir, "recipe.json")
        with open(rjson, encoding="utf-8") as f:
            data = json.load(f)

        # Rebuild with the aws block placed just before variables for readability.
        out = {}
        for key, value in data.items():
            if key == "variables":
                out["aws"] = {"service": service, "parity": parity, "deploy": deploy}
            out[key] = value
        if "aws" not in out:  # no variables key (shouldn't happen) -> append
            out["aws"] = {"service": service, "parity": parity, "deploy": deploy}

        with open(rjson, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
            f.write("\n")

        readme = os.path.join(rdir, "README.md")
        with open(readme, encoding="utf-8") as f:
            body = f.read()
        if "Path to AWS" not in body:
            section = (
                f"\n## 🚀 Path to AWS\n\n"
                f"**Managed service:** {service}\n\n"
                f"{parity}\n\n"
                f"**Deploy:** {deploy}\n"
            )
            if not body.endswith("\n"):
                body += "\n"
            body += section
            with open(readme, "w", encoding="utf-8") as f:
                f.write(body)
        print(f"updated {rid}")


if __name__ == "__main__":
    main()
