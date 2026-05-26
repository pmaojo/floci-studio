# Floci.io — The Ultimate Local AWS Cockpit & Marketplace 🚀

Welcome to the ultimate cockpit of **Floci.io**.

---

## 🎨 Ecosystem Architecture

The Floci.io ecosystem is composed of several seamlessly coordinated architectural pieces to provide an agile and powerful experience:

```mermaid
graph TD
    %% Components
    LLM[AI / Claude / Cursor] <-->|JSON-RPC Stdio| MCP[Python MCP Server - uv]
    SPA[Vite SPA - React] <-->|API Calls| Backend[FastAPI Backend - Python]
    MCP <-->|In-Memory ASGI| Backend
    Backend <-->|Local SDK / FS| LocalStack[AWS Localstack / Floci Engine]
    Backend <-->|Docker Socket| DockerMarket[Docker Compose - Marketplace]

    %% Styles
    style LLM fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px
    style MCP fill:#efebe9,stroke:#8d6e63,stroke-width:2px
    style SPA fill:#ede7f6,stroke:#673ab7,stroke-width:2px
    style Backend fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style LocalStack fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style DockerMarket fill:#eceff1,stroke:#607d8b,stroke-width:2px
```

* **Vite SPA (React + TypeScript):** Reactive tactical interface with dynamic loading (Lazy Loading) of ~30 AWS service views, optimized to offer ultra-fast rendering and a premium-retro aesthetic.
* **Backend API (FastAPI + Python):** Backend gateway running on port `8000` that interacts with the Docker Socket, orchestrates Marketplace recipes, routes compatibility calls, and persists state in JSON files on disk.
* **Native MCP Server (Python + `uv`):** Model Context Protocol server (v1.27.1+) that natively communicates in-memory via `httpx.ASGITransport` with the backend. It enables Large Language Models (LLMs) to audit the AWS emulator state and provision local architectures via natural language.
* **Engine (AWS Localstack / Floci):** Local AWS emulator exposed on port `4566`.

---

## 🛍️ Local Marketplace: Modular Infrastructure

Floci.io includes a catalog of parameterized local recipes in the `/recipes` folder. Each recipe automates the provisioning of local interconnected software using Docker Compose, allowing AI to:
1. **List** available recipes with their configurable environment variables.
2. **Deploy** and install local infrastructures on the fly.
3. **Monitor** Docker startup progress in real-time by reading log traces.
4. **Teardown** and clean up the environment when tasks are completed.

### Available Recipes

- **AWS IoT Core (MQTT)**
- **Keycloak + PostgreSQL**
- **Mailpit (SMTP)**
- **Meilisearch**
- **MinIO (S3 Compatible Storage)**
- **Nginx Proxy Manager**
- **Observability (Grafana & Prometheus)**
- **PocketBase**
- **PostgreSQL Database**
- **RabbitMQ Broker**
- **Redis Cache & Broker**
- **Redpanda (Kafka Compatible)**
- **AWS Transfer Family (SFTP)**

---

## 🛠️ Floci MCP Server Integration

The MCP server allows you to interact with your local AWS environment and local software Marketplace using natural language.

### Option A: Native Execution with `uv` (Recommended)
`uv` automatically manages the virtual environment and Python version transparently without complex global configurations on Windows:

```bash
# Sync virtual environment and dependencies
uv sync --project mcp

# Start the MCP server
uv run --project mcp python mcp/floci_mcp.py
```

### Option B: Dockerized Execution 🐳
If you prefer to completely isolate the server or don't have Python/uv on your host, you can run the MCP server directly as an interactive Docker container:

```bash
# Build the MCP server image
docker build -t floci-mcp mcp/

# Start the MCP server bound to standard input and output (stdio)
docker run -i --rm -e AWS_ENDPOINT_URL=http://host.docker.internal:4566 -e SIDECAR_TOKEN=open floci-mcp
```

### Configuration in Claude Desktop / Cursor
Add this block to your `claude_desktop_config.json` file to load it automatically:

```json
{
  "mcpServers": {
    "floci-mcp": {
      "command": "uv",
      "args": [
        "run",
        "--project",
        "./mcp",
        "python",
        "./mcp/floci_mcp.py"
      ],
      "env": {
        "SIDECAR_TOKEN": "open",
        "AWS_ENDPOINT_URL": "http://127.0.0.1:4566"
      }
    }
  }
}
```

---

## 🚀 From Floci to Real Amazon AWS: How to Go to Production?

Once your application and its associated infrastructure are tested, validated, and working in your local Floci.io cockpit, there are three recommended paths to automate deployment to Real AWS in production using automation "copilots":

### 1. AWS Copilot CLI (The Official AWS Copilot)
[AWS Copilot](https://aws.github.io/copilot-cli/) is the perfect tool to transpile containerized Docker recipes to real production environments:
* **How it works:** AWS Copilot analyzes your Dockerfile and dependencies and autonomously provisions all necessary infrastructure on **Amazon ECS (Elastic Container Service)** under AWS Fargate (serverless).
* **Path to production flow:**
  ```bash
  # Initialize the containerized application in AWS
  copilot init --app my-floci-app --name api-service --type "Load Balanced Web Service" --dockerfile ./Dockerfile
  
  # Deploy the environment to production
  copilot deploy --env prod
  ```
* **Advantages:** Automatically provisions the Load Balancer (ALB), private network VPC, IAM security roles, and SSL routing without the need to write manual CloudFormation templates.

### 2. Portable Infrastructure as Code (IaC) (Terraform / Pulumi / AWS CDK)
If your Floci cockpit is interacting with resources like RDS databases, S3 buckets, or SQS queues, using IaC guarantees immediate portability:
* **How it works:** During local development, you configure your Terraform or AWS CDK provider to redirect API endpoint calls to the local Floci address (`http://localhost:4566`).
* **Path to production flow:** Simply remove the endpoint rewrite lines from your configuration code so the Terraform SDK or CDK interacts directly with the real global APIs of Amazon Web Services:
  ```hcl
  # Local Development (pointing to Floci)
  provider "aws" {
    region                      = "us-east-1"
    s3_use_path_style           = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    endpoints {
      s3     = "http://localhost:4566"
      lambda = "http://localhost:4566"
      sqs    = "http://localhost:4566"
    }
  }

  # Real Production (Remove endpoints block to use real AWS)
  provider "aws" {
    region = "us-east-1"
  }
  ```

### 3. AWS SAM (Serverless Application Model)
If your application uses event-driven architectures with **AWS Lambda** functions and **API Gateway**:
* **How it works:** SAM allows you to test interconnected functions locally in Floci and deploy them to real production in a single step.
* **Path to production flow:**
  ```bash
  # Validate local serverless template
  sam validate
  
  # Interactive and guided deployment to real AWS
  sam deploy --guided
  ```

---

included GUI

<img width="1280" height="800" alt="image" src="https://github.com/user-attachments/assets/03ad8acc-e932-47c1-b955-bf84868b4d3e" />


> [!TIP]
> **Development Excellence:** Floci.io ensures that 100% of your code and infrastructure will run exactly the same in real AWS as on your development machine. Test locally at zero cost and deploy to production with total confidence!
