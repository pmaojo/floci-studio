---
title: DynamoDB — Tables & Items
description: Create tables, put and query items, scan with filters, and use DynamoDB Admin — all locally with Floci.
---

DynamoDB is Floci's most-used database service. This guide covers the full lifecycle: table creation, item operations, querying, scanning, and the optional DynamoDB Admin web UI.

## Create a table

Go to **DynamoDB** in the sidebar → click **Create Table**.

| Field | Required | Notes |
|---|---|---|
| Table name | Yes | Unique within the region |
| Partition key | Yes | String, Number, or Binary |
| Sort key | No | Enables range queries |
| Billing mode | Yes | `PAY_PER_REQUEST` (default) or `PROVISIONED` |

For a simple user table:

- **Table name:** `users`
- **Partition key:** `userId` (String)

For an event log with time-ordered access:

- **Table name:** `events`
- **Partition key:** `entityId` (String)
- **Sort key:** `timestamp` (Number)

## Put an item

Select a table → click **Put Item**. Items are entered as JSON:

```json
{
  "userId": "usr-001",
  "email": "alice@example.com",
  "role": "admin",
  "createdAt": 1716400000
}
```

All attribute names and types are inferred from the JSON.

## Get an item by key

**Get Item** requires the exact partition key (and sort key if defined):

```json
{ "userId": "usr-001" }
```

## Query a table

Querying returns items that share a partition key, optionally filtered by sort key range. In the Query panel:

1. Enter the **partition key value** (e.g. `entityId = "order-42"`)
2. Optionally add a **sort key condition** (e.g. `timestamp BETWEEN 1716000000 AND 1716999999`)
3. Add a **filter expression** to narrow results beyond the key conditions

Filter expressions support `=`, `<>`, `<`, `>`, `begins_with`, `contains`, and `attribute_exists`.

## Scan a table

Scan reads every item in the table. Use it for:

- Small tables where a full read is acceptable
- Exploratory queries when you don't know the key
- Applying complex filter expressions across all items

Scans are paginated. Click **Next page** to load more.

:::caution
Scans on large tables are slow and consume read capacity. Prefer queries with key conditions in production.
:::

## Seed mock data

The MCP `seed_mock_data` tool generates realistic fake items via Faker:

```
You: Seed 50 users into the "users" table
Claude: [calls seed_mock_data(target="dynamodb", target_name="users")]
```

You can also pass a `custom_schema` to control the shape:

```json
{
  "userId": "uuid",
  "email": "email",
  "role": "random_element(['admin','viewer','editor'])",
  "score": "random_int(0,100)"
}
```

## DynamoDB Admin web UI

For a richer browsing experience, deploy the **DynamoDB Admin** recipe from the Marketplace:

1. Go to **Marketplace** → find **DynamoDB Admin** → click Deploy
2. Open `http://localhost:8001`

DynamoDB Admin gives you a table browser, item editor, and raw scan view — useful when working with complex nested documents.

:::tip
Deploy via MCP in one line:
`deploy_marketplace_app(recipe_id="dynamodb-admin")`
:::

## SDK integration

### Python (boto3)

```python
import boto3

dynamo = boto3.resource(
    "dynamodb",
    endpoint_url="http://localhost:4566",
    region_name="us-east-1",
    aws_access_key_id="test",
    aws_secret_access_key="test",
)

table = dynamo.Table("users")

# Put
table.put_item(Item={"userId": "usr-001", "email": "alice@example.com"})

# Get
response = table.get_item(Key={"userId": "usr-001"})
print(response["Item"])

# Query
from boto3.dynamodb.conditions import Key
response = table.query(
    KeyConditionExpression=Key("userId").eq("usr-001")
)
```

### TypeScript (@aws-sdk/client-dynamodb)

```ts
import { DynamoDBClient, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({
  endpoint: "http://localhost:4566",
  region: "us-east-1",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});

// Put
await client.send(new PutItemCommand({
  TableName: "users",
  Item: marshall({ userId: "usr-001", email: "alice@example.com" }),
}));

// Get
const { Item } = await client.send(new GetItemCommand({
  TableName: "users",
  Key: marshall({ userId: "usr-001" }),
}));
console.log(unmarshall(Item!));
```

## MCP tools

| Tool | What it does |
|---|---|
| `list_dynamodb_tables` | Lists all tables |
| `create_dynamodb_table` | Creates a table |
| `delete_dynamodb_table` | Deletes a table |
| `put_dynamodb_item` | Puts an item |
| `get_dynamodb_item` | Gets an item by key |
| `query_dynamodb` | Queries by key condition |
| `scan_dynamodb` | Full table scan with optional filter |
| `delete_dynamodb_item` | Deletes an item |

## Next steps

- [Tag your tables](/guides/tags/) to track environment and team ownership
- [Connect Lambda to DynamoDB](/guides/workflows/) for a complete event-driven flow
- [Deploy DynamoDB Admin](/guides/marketplace/) for a visual browser
