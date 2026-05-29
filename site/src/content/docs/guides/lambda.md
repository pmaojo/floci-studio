---
title: Lambda Functions
description: Create, invoke, and debug Lambda functions in Floci Studio.
---

Floci Studio's Lambda view lets you create functions from templates, invoke them with custom payloads, and stream the execution logs — all without leaving the browser.

## Creating a function

1. Click **Lambda** in the sidebar.
2. Click **Create Function**.
3. Fill in:
   - **Function name** — e.g., `process-order`
   - **Runtime** — Python 3.12, Node.js 20, Java 17, Go 1.x, and others
   - **Handler** — e.g., `index.handler` (Node) or `lambda_function.lambda_handler` (Python)
   - **Code** — inline editor or select a starter template
4. Optionally set timeout, memory, and environment variables.

The function deploys immediately to the local engine.

## Invoking a function

Click a function name to open the detail view. In the **Invoke** tab:

1. Enter a JSON payload in the editor:
   ```json
   {
     "orderId": "4419",
     "action": "process"
   }
   ```
2. Click **Invoke**.
3. The response and status code appear below.

Toggle **Async** to invoke without waiting for a response (Event invocation type).

## Reading logs

Switch to the **Logs** tab to see the latest CloudWatch log stream for the function. Logs are fetched from `/aws/lambda/{function-name}`.

## Environment variables

In the **Configuration** tab, add key-value pairs. They're available in your function as `process.env.KEY` (Node) or `os.environ["KEY"]` (Python).

## SDK integration

```python
import boto3, json

lambda_client = boto3.client(
    "lambda", endpoint_url="http://localhost:4566",
    region_name="us-east-1",
    aws_access_key_id="test", aws_secret_access_key="test"
)

# Create a function (inline zip)
import zipfile, io

code = b'def lambda_handler(event, context): return {"statusCode": 200}'
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    z.writestr("lambda_function.py", code)
buf.seek(0)

lambda_client.create_function(
    FunctionName="process-order",
    Runtime="python3.12",
    Role="arn:aws:iam::000000000000:role/lambda-role",
    Handler="lambda_function.lambda_handler",
    Code={"ZipFile": buf.read()},
)

# Invoke
resp = lambda_client.invoke(
    FunctionName="process-order",
    Payload=json.dumps({"orderId": "4419"}).encode(),
)
print(json.loads(resp["Payload"].read()))
```

## Triggering from SQS

To create a Lambda→SQS event source mapping:

```python
lambda_client.create_event_source_mapping(
    EventSourceArn="arn:aws:sqs:us-east-1:000000000000:order-events",
    FunctionName="process-order",
    BatchSize=5,
)
```

Messages sent to `order-events` will now trigger `process-order` automatically.
