---
title: Workflows — Connecting Services
description: Build real event-driven flows locally. Lambda reads SQS, writes to DynamoDB, notifies via SNS.
---

Real applications connect multiple AWS services. This guide walks through a complete order-processing flow built entirely in Floci: SQS triggers Lambda, Lambda persists to DynamoDB and notifies via SNS.

## The pattern

```
Producer → SQS queue → Lambda → DynamoDB table
                                └──► SNS topic → (email / webhook)
```

You can build this manually in the UI, or let your AI agent do it in one conversation.

## Build it with MCP (one conversation)

```
You: Build me an order processing pipeline:
     - An SQS FIFO queue called "orders"
     - A DynamoDB table called "order-records" with orderId as partition key
     - An SNS topic called "order-notifications"
     - A Python Lambda called "process-order" that reads from the queue,
       writes the order to DynamoDB, and publishes to the SNS topic
     - Tag everything with Project=order-service

Claude:
1. create_sqs_queue(name="orders", fifo=True)
2. create_dynamodb_table(name="order-records", partition_key="orderId")
3. create_sns_topic(name="order-notifications")
4. create_lambda_function(name="process-order", runtime="python3.12", ...)
5. tag_resources(resource_arns=[...], tags={"Project": "order-service"})
```

The agent wires everything together and returns the ARNs.

## Step-by-step manually

### 1. Create the queue

Go to **SQS** → **Create Queue**:

- Name: `orders.fifo`
- Type: FIFO
- Content-based deduplication: enabled

### 2. Create the DynamoDB table

Go to **DynamoDB** → **Create Table**:

- Name: `order-records`
- Partition key: `orderId` (String)

### 3. Create the SNS topic

Go to **SNS** → **Create Topic**:

- Name: `order-notifications`
- Type: Standard

### 4. Create the Lambda function

Go to **Lambda** → **Create Function**:

- Name: `process-order`
- Runtime: Python 3.12
- Handler: `index.handler`

Use this inline code:

```python
import json
import os
import boto3

ENDPOINT = os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566")
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
CREDS = {"aws_access_key_id": "test", "aws_secret_access_key": "test"}

dynamo = boto3.resource("dynamodb", endpoint_url=ENDPOINT, region_name=REGION, **CREDS)
sns = boto3.client("sns", endpoint_url=ENDPOINT, region_name=REGION, **CREDS)

TABLE = dynamo.Table("order-records")
TOPIC_ARN = os.environ["SNS_TOPIC_ARN"]


def handler(event, context):
    for record in event.get("Records", []):
        body = json.loads(record["body"])
        order_id = body["orderId"]

        TABLE.put_item(Item={"orderId": order_id, "status": "received", **body})

        sns.publish(
            TopicArn=TOPIC_ARN,
            Message=json.dumps(body),
            Subject=f"Order {order_id} received",
        )

    return {"statusCode": 200, "processed": len(event.get("Records", []))}
```

Add an environment variable `SNS_TOPIC_ARN` with the ARN of your `order-notifications` topic.

### 5. Send a test order

Go to **SQS** → select `orders.fifo` → **Send Message**:

```json
{
  "orderId": "ord-001",
  "customerId": "cust-42",
  "items": [{ "sku": "WIDGET-A", "qty": 3 }],
  "total": 59.99
}
```

### 6. Invoke Lambda manually

Go to **Lambda** → select `process-order` → **Invoke** with the SQS event shape:

```json
{
  "Records": [{
    "body": "{\"orderId\":\"ord-001\",\"customerId\":\"cust-42\",\"total\":59.99}",
    "messageId": "abc-123",
    "receiptHandle": "abc-123"
  }]
}
```

### 7. Verify in DynamoDB

Go to **DynamoDB** → `order-records` → **Scan** — you should see the order item.

### 8. Check Lambda logs

Go to **Lambda** → select `process-order` → **Logs** tab to see the CloudWatch output.

## Add an SQS event source mapping

To trigger Lambda automatically on new queue messages (vs manual invoke), use the MCP:

```
You: Wire the "orders.fifo" queue as a trigger for the "process-order" Lambda
Claude: [calls run_local_aws_cmd(
    "lambda create-event-source-mapping "
    "--function-name process-order "
    "--event-source-arn arn:aws:sqs:us-east-1:000000000000:orders.fifo "
    "--batch-size 10"
)]
```

## Subscribe to order notifications

Add an email subscription to see the SNS publish in action (requires Mailpit):

1. Deploy **Mailpit** from the Marketplace
2. Go to **SNS** → `order-notifications` → **Subscribe**
3. Protocol: `email`, Endpoint: `dev@localhost`
4. Open `http://localhost:8025` (Mailpit) to see incoming emails

## Export to Terraform

Once the flow works locally, export it:

```
You: Export the order-service resources to Terraform
Claude: [calls find_resources_by_tag(tag_key="Project", tag_value="order-service")]
       [calls export_to_terraform()]
```

The generated HCL includes all tagged resources ready for a real AWS account.

## Next steps

- [Tag management](/guides/tags/) — label your resources for export and discovery
- [Lambda guide](/guides/lambda/) — environment variables, runtimes, logs
- [DynamoDB guide](/guides/dynamodb/) — query patterns and the Admin UI
- [Marketplace](/guides/marketplace/) — add Mailpit, Temporal, and other services to your stack
