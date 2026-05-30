---
title: Tag Management
description: Apply, search, and remove tags across all AWS resource types using the Floci MCP tag tools.
---

Tags are key-value pairs you attach to AWS resources to track ownership, environment, cost, and lifecycle. Floci exposes the full AWS Resource Groups Tagging API through 6 MCP tools, covering every resource type in the emulator.

## Why tag resources locally

Even in a local environment, tags pay off:

- **Environment separation** — `Environment=dev` vs `staging` on the same endpoint
- **Cost attribution** — export tagged resources to Terraform with cost center labels already in place
- **Agent-driven workflows** — your AI agent can find and operate on all resources for a project by a single tag, without needing to know each ARN

## Apply tags to resources

Use `tag_resources` with a list of ARNs and a tag dict:

```
You: Tag the "orders" SQS queue and the "orders" DynamoDB table with Environment=prod and Team=backend
Claude: [calls tag_resources(
    resource_arns=[
      "arn:aws:sqs:us-east-1:000000000000:orders",
      "arn:aws:dynamodb:us-east-1:000000000000:table/orders"
    ],
    tags={"Environment": "prod", "Team": "backend"}
)]
```

You can tag multiple resources in one call regardless of service type.

## Find resources by tag

`find_resources_by_tag` searches across all services:

```
You: Show me all resources tagged Environment=prod
Claude: [calls find_resources_by_tag(tag_key="Environment", tag_value="prod")]
```

Returns a list of resource ARNs with their full tag sets. You can also filter by resource type:

```python
# Only Lambda functions and DynamoDB tables tagged with Team=platform
find_resources_by_tag(
    tag_key="Team",
    tag_value="platform",
    resource_types=["lambda:function", "dynamodb:table"]
)
```

## Remove tags

`untag_resources` removes specific keys without affecting other tags:

```
You: Remove the "Deprecated" tag from all resources tagged with it
Claude: [calls find_resources_by_tag(tag_key="Deprecated")]
# then for each resource ARN:
[calls untag_resources(resource_arns=[...], tag_keys=["Deprecated"])]
```

## Discover existing tags

Before tagging, see what keys are already in use:

```
You: What tag keys are we using across all resources?
Claude: [calls get_all_tag_keys()]
→ { "tagKeys": ["Environment", "Project", "Team", "Version"] }
```

And the values for a key:

```
You: What values does the Environment tag have?
Claude: [calls get_tag_values(key="Environment")]
→ { "key": "Environment", "values": ["dev", "prod", "staging"] }
```

## Inventory all tagged resources

`list_all_tagged_resources` returns everything that has at least one tag:

```
You: Give me a full inventory of tagged resources
Claude: [calls list_all_tagged_resources()]
```

Filter to specific services to narrow the list:

```python
list_all_tagged_resources(
    resource_types=["s3", "lambda:function", "sqs:queueurl"]
)
```

## Common tag schemes

### Environment labeling

```json
{
  "Environment": "dev",
  "ManagedBy": "floci"
}
```

### Project / team ownership

```json
{
  "Project": "checkout-service",
  "Team": "payments",
  "CostCenter": "eng-platform"
}
```

### Lifecycle tracking

```json
{
  "CreatedBy": "claude-agent",
  "CreatedAt": "2026-05-30",
  "TTL": "7d"
}
```

## Tag then export to Terraform

After tagging, `export_to_terraform` includes tags in the generated HCL:

```
You: Export all resources to Terraform
Claude: [calls export_to_terraform()]
```

The generated code includes the tag map on each resource block, ready for production.

## MCP tools reference

| Tool | Parameters | Description |
|---|---|---|
| `get_all_tag_keys` | — | Lists all tag keys in use |
| `get_tag_values` | `key` | Lists values for a tag key |
| `find_resources_by_tag` | `tag_key, tag_value?, resource_types?` | Searches resources by tag |
| `tag_resources` | `resource_arns, tags` | Applies tags to resources |
| `untag_resources` | `resource_arns, tag_keys` | Removes tag keys from resources |
| `list_all_tagged_resources` | `resource_types?` | Lists all tagged resources |
