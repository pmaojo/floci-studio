---
title: Configuration
description: Environment variables, endpoint settings, and AWS credentials for Floci Studio.
---

## AWS endpoint

Floci Studio emulates the AWS API surface on `http://localhost:4566`. Any AWS SDK client that supports a custom endpoint will work without code changes.

The studio UI reads its endpoint from the **Settings** page (`/settings`). The default is:

```
http://localhost:4566
```

To change it, open Settings in the sidebar and update the Endpoint field. The value is persisted in `localStorage`.

## AWS credentials

For local emulation, credentials are ignored by the engine but required by SDK clients. The defaults are:

```
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=us-east-1
```

These are pre-configured in the studio. You can override them in Settings.

## Environment variables

When running via Docker Compose, these variables can be set in a `.env` file at the project root:

| Variable | Default | Description |
|---|---|---|
| `AWS_ENDPOINT_URL` | `http://localhost:4566` | Endpoint the sidecar uses to reach the engine |
| `AWS_DEFAULT_REGION` | `us-east-1` | Default AWS region |
| `AWS_ACCESS_KEY_ID` | `test` | Access key (any value works) |
| `AWS_SECRET_ACCESS_KEY` | `test` | Secret key (any value works) |
| `SIDECAR_TOKEN` | `open` | Auth token for the FastAPI sidecar |
| `SIDECAR_PORT` | `8000` | Port the sidecar listens on |

## Configuring your SDK

### Python (boto3)

```python
import boto3

client = boto3.client(
    "sqs",
    endpoint_url="http://localhost:4566",
    region_name="us-east-1",
    aws_access_key_id="test",
    aws_secret_access_key="test",
)
```

### JavaScript / TypeScript

```typescript
import { SQSClient } from "@aws-sdk/client-sqs";

const client = new SQSClient({
  endpoint: "http://localhost:4566",
  region: "us-east-1",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});
```

### Terraform

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  s3_use_path_style           = true

  endpoints {
    sqs    = "http://localhost:4566"
    sns    = "http://localhost:4566"
    lambda = "http://localhost:4566"
    s3     = "http://localhost:4566"
  }
}
```

Remove the `endpoints` block when deploying to real AWS — the rest of your code stays unchanged.
