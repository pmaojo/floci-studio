---
title: Tools Reference
description: Complete reference for all 84 MCP tools organized by service module.
---

All tools are async and return JSON-serializable values. Boto3 `datetime`, `Decimal`, and `bytes` are automatically converted.

## Meta & Health

| Tool | Parameters | Description |
|---|---|---|
| `check_floci_health` | — | Returns health status of engine + sidecar |
| `list_aws_services` | — | Lists all AWS services visible in the emulator |
| `get_service_resources` | `service` | Lists resources for a specific service |
| `get_architecture_diagram` | — | Returns a Mermaid diagram of current infrastructure |
| `get_cost_forecast` | — | Returns mock cost forecast data |
| `get_network_topology` | — | Returns network topology as graph data |

## Lambda

| Tool | Parameters | Description |
|---|---|---|
| `list_lambda_functions` | — | Lists all Lambda functions |
| `create_lambda_function` | `name, runtime, handler, code_source, description?, timeout?, memory?` | Creates a function |
| `update_lambda_code` | `function_name, runtime, code_source` | Updates function code |
| `update_lambda_config` | `function_name, handler?, timeout?, memory?, env_vars?` | Updates configuration |
| `invoke_lambda` | `function_name, payload, async?` | Invokes a function, returns response |
| `get_lambda_logs` | `function_name` | Fetches latest CloudWatch log stream |
| `delete_lambda` | `function_name` | Deletes a function |
| `get_lambda_runtimes` | — | Returns available runtimes and templates |

## SQS

| Tool | Parameters | Description |
|---|---|---|
| `list_sqs_queues` | — | Lists all queues |
| `create_sqs_queue` | `name, fifo?` | Creates a queue (FIFO if `fifo=True`) |
| `delete_sqs_queue` | `queue_url` | Deletes a queue |
| `send_sqs_message` | `queue_url, body, message_group_id?` | Sends a message |
| `receive_sqs_messages` | `queue_url, max_messages?, wait_seconds?` | Receives messages (not deleted automatically) |
| `delete_sqs_message` | `queue_url, receipt_handle` | Deletes a received message (ACK) |
| `get_sqs_queue_attributes` | `queue_url` | Returns all queue attributes |
| `purge_sqs_queue` | `queue_url` | Deletes all messages in the queue |

## SNS

| Tool | Parameters | Description |
|---|---|---|
| `list_sns_topics` | — | Lists all topics |
| `create_sns_topic` | `name, fifo?` | Creates a topic |
| `delete_sns_topic` | `topic_arn` | Deletes a topic |
| `publish_sns_message` | `topic_arn, message, subject?` | Publishes a message |
| `list_sns_subscriptions` | `topic_arn` | Lists subscriptions for a topic |
| `subscribe_sns` | `topic_arn, protocol, endpoint` | Adds a subscription |
| `unsubscribe_sns` | `subscription_arn` | Removes a subscription |
| `get_sns_topic_attributes` | `topic_arn` | Returns all topic attributes |

## S3

| Tool | Parameters | Description |
|---|---|---|
| `list_s3_buckets` | — | Lists all buckets |
| `create_s3_bucket` | `name, region?` | Creates a bucket |
| `delete_s3_bucket` | `name, force?` | Deletes a bucket (force=True empties it first) |
| `list_s3_objects` | `bucket, prefix?` | Lists objects |
| `put_s3_object` | `bucket, key, content, content_type?` | Uploads an object |
| `get_s3_object` | `bucket, key` | Downloads an object, returns content as string |
| `delete_s3_object` | `bucket, key` | Deletes an object |
| `generate_s3_presigned_url` | `bucket, key, expires_in?` | Generates a presigned GET URL |

## DynamoDB

| Tool | Parameters | Description |
|---|---|---|
| `list_dynamodb_tables` | — | Lists all tables |
| `create_dynamodb_table` | `name, partition_key, sort_key?, billing_mode?` | Creates a table |
| `delete_dynamodb_table` | `name` | Deletes a table |
| `put_dynamodb_item` | `table, item` | Puts an item (DynamoDB native format) |
| `get_dynamodb_item` | `table, key` | Gets an item by key |
| `query_dynamodb` | `table, key_condition, filter_expression?, limit?` | Queries a table |
| `scan_dynamodb` | `table, filter_expression?, limit?` | Scans a table |
| `delete_dynamodb_item` | `table, key` | Deletes an item |

DynamoDB items use native type format: `{"pk": {"S": "user#123"}, "count": {"N": "42"}}`.

## Secrets Manager

| Tool | Parameters | Description |
|---|---|---|
| `list_secrets` | — | Lists all secrets |
| `create_secret` | `name, value, description?` | Creates a secret |
| `get_secret_value` | `name_or_arn` | Retrieves a secret value |
| `update_secret` | `name_or_arn, value` | Updates a secret value |
| `delete_secret` | `name_or_arn, force?` | Deletes a secret |

## KMS

| Tool | Parameters | Description |
|---|---|---|
| `run_kms_diagnostic` | — | Runs the full KMS diagnostic flow |
| `list_kms_keys` | — | Lists all KMS keys |
| `create_kms_key` | `description?, alias?` | Creates a key and optional alias |
| `kms_encrypt` | `key_id, plaintext` | Encrypts plaintext, returns base64 ciphertext |
| `kms_decrypt` | `ciphertext_blob` | Decrypts base64 ciphertext |

## EventBridge

| Tool | Parameters | Description |
|---|---|---|
| `list_eventbridge_buses` | — | Lists all event buses |
| `put_eventbridge_events` | `bus_name, entries` | Puts events onto a bus |
| `list_eventbridge_rules` | `bus_name?` | Lists rules for a bus |
| `create_eventbridge_rule` | `name, schedule_or_pattern, bus_name?, targets?` | Creates a rule with targets |
| `delete_eventbridge_rule` | `name, bus_name?` | Deletes a rule and its targets |

## Step Functions

| Tool | Parameters | Description |
|---|---|---|
| `list_step_functions` | — | Lists state machines |
| `start_sfn_execution` | `state_machine_arn, input_json` | Starts an execution |
| `describe_sfn_execution` | `execution_arn` | Returns status and output |
| `list_sfn_executions` | `state_machine_arn, status_filter?` | Lists executions |

## Athena

| Tool | Parameters | Description |
|---|---|---|
| `list_glue_databases` | — | Lists Glue catalog databases |
| `run_athena_query` | `sql, database, workgroup?` | Runs a query, polls for result, returns rows |
| `get_athena_query_history` | — | Returns recent query history |

## SES

| Tool | Parameters | Description |
|---|---|---|
| `list_ses_identities` | — | Lists verified email identities |
| `verify_ses_email` | `email` | Verifies an email address |
| `send_ses_email` | `from_addr, to_addr, subject, body_text?, body_html?` | Sends an email |
| `get_ses_send_quota` | — | Returns send quota stats |

## Marketplace

| Tool | Parameters | Description |
|---|---|---|
| `list_marketplace_recipes` | — | Lists all available recipes |
| `get_marketplace_installations` | — | Lists deployed recipes |
| `get_marketplace_logs` | `recipe_id` | Tails Docker logs for a recipe |
| `deploy_marketplace_app` | `recipe_id, variables?` | Deploys a recipe |
| `teardown_marketplace_app` | `recipe_id` | Tears down a deployed recipe |

## Developer Tools

| Tool | Parameters | Description |
|---|---|---|
| `export_to_terraform` | — | Generates Terraform for current resources |
| `run_local_aws_cmd` | `command` | Runs an arbitrary AWS CLI command against the local engine |
| `seed_mock_data` | `target, target_name, schema?` | Seeds mock data into a service |
| `proxy_http_request` | `method, url, headers?, body?` | Proxies an HTTP request via the sidecar |
| `generate_jwt_token` | `claims, secret?, algorithm?` | Generates a JWT token |
| `run_ui_tests` | `test_pattern?` | Runs Playwright UI tests |
| `get_network_topology` | — | Returns network topology |
