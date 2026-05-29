---
title: SQS — Queues & Messages
description: Create queues, send messages, read them in the UI, and integrate with your application.
---

SQS in floci.io has a full drill-down interface: create a queue, inspect its messages, send test payloads, and view all queue attributes — without leaving the browser.

## Creating a queue

1. Click **SQS** in the sidebar.
2. Click **Create Queue**.
3. Enter a queue name (e.g., `order-events`).
4. Toggle **FIFO Queue** if you need ordered, exactly-once delivery. The `.fifo` suffix is added automatically.
5. Click Create.

The queue appears in the list immediately.

## Sending a message

From the queue list, click **Send** on any queue row. A send panel opens inline.

Enter your message body (plain text or JSON) and click **Send Message**.

```json
{
  "orderId": "4419",
  "customerId": "acme-corp",
  "total": 1250.00
}
```

For FIFO queues, a `MessageGroupId` of `default` is assigned automatically. You can override this in your SDK calls.

## Reading messages (Messages tab)

Click a queue card (or click **Inspect**) to open the drill-down view. Switch to the **Messages** tab.

Click **Receive Messages** to poll the queue. Up to 10 messages are fetched (`MaxNumberOfMessages=10`, `WaitTimeSeconds=0`).

Each message shows:
- **MessageId** — unique identifier
- **Body** — expandable, with JSON pretty-print if valid JSON
- **Sent** timestamp and **Receive Count**
- **ACK** button — deletes the message (`DeleteMessage`) when you're done with it

:::caution
Messages received are not deleted automatically. Click **ACK** to remove them, or they'll reappear after the visibility timeout.
:::

## Queue attributes

Switch to the **Attributes** tab to see:

| Attribute | Description |
|---|---|
| ApproximateNumberOfMessages | Messages available to receive |
| ApproximateNumberOfMessagesNotVisible | Messages in flight (received but not deleted) |
| ApproximateNumberOfMessagesDelayed | Messages in delay period |
| VisibilityTimeout | Seconds a received message is hidden |
| MessageRetentionPeriod | How long messages are kept |
| QueueArn | Full ARN |
| RedrivePolicy | DLQ configuration |

## Purging a queue

Click **Purge** in the queue header (detail view) to delete all messages instantly. You'll be asked to confirm.

## SDK integration

```python
import boto3

sqs = boto3.client("sqs", endpoint_url="http://localhost:4566",
                   region_name="us-east-1",
                   aws_access_key_id="test", aws_secret_access_key="test")

# Create
url = sqs.create_queue(QueueName="order-events")["QueueUrl"]

# Send
sqs.send_message(QueueUrl=url, MessageBody='{"orderId": "4419"}')

# Receive
msgs = sqs.receive_message(QueueUrl=url, MaxNumberOfMessages=5)["Messages"]
for msg in msgs:
    print(msg["Body"])
    sqs.delete_message(QueueUrl=url, ReceiptHandle=msg["ReceiptHandle"])
```
