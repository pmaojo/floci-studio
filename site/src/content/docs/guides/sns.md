---
title: SNS — Topics & Subscriptions
description: Create topics, manage subscribers, publish messages, and use FIFO topics.
---

SNS in floci.io supports standard and FIFO topics, subscription management across all protocols, and a publish panel for testing message delivery.

## Creating a topic

1. Click **SNS** in the sidebar.
2. Click **Create Topic**.
3. Enter a topic name (e.g., `system-alerts`).
4. Toggle **FIFO Topic** if you need ordered delivery and deduplication. The `.fifo` suffix is added automatically, and `ContentBasedDeduplication` is enabled.
5. Click Create.

## Topic detail view

Click any topic card to open the drill-down. Three tabs are available:

### Subscriptions tab

Lists all active subscriptions with protocol, endpoint, and confirmation status. Click **Add Subscription** to subscribe a new endpoint.

**Supported protocols:**
- `email` / `email-json`
- `http` / `https`
- `sqs` — paste the queue ARN
- `lambda` — paste the function ARN
- `sms`

In local emulation, all subscriptions are confirmed immediately regardless of protocol.

### Publish Message tab

Send a message to the topic:

```json
{
  "event": "high_cpu",
  "instance": "i-0abc123",
  "value": 95.2
}
```

An optional **Subject** field is available for email-protocol subscribers.

### Attributes tab

Shows all topic metadata via `GetTopicAttributes`:

| Key | Description |
|---|---|
| TopicArn | Full ARN |
| SubscriptionsConfirmed | Active subscriber count |
| SubscriptionsPending | Awaiting confirmation |
| FifoTopic | `true` if FIFO |
| ContentBasedDeduplication | Enabled for FIFO topics |
| DisplayName | Optional display name for email |
| KmsMasterKeyId | KMS key if encryption enabled |

## SDK integration

```python
import boto3

sns = boto3.client("sns", endpoint_url="http://localhost:4566",
                   region_name="us-east-1",
                   aws_access_key_id="test", aws_secret_access_key="test")

# Create standard topic
arn = sns.create_topic(Name="system-alerts")["TopicArn"]

# Create FIFO topic
fifo_arn = sns.create_topic(
    Name="order-events.fifo",
    Attributes={"FifoTopic": "true", "ContentBasedDeduplication": "true"}
)["TopicArn"]

# Subscribe SQS
sns.subscribe(TopicArn=arn, Protocol="sqs",
              Endpoint="arn:aws:sqs:us-east-1:000000000000:my-queue")

# Publish
sns.publish(TopicArn=arn, Message='{"event": "alarm"}', Subject="Alert")
```
