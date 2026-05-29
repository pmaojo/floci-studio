---
title: AWS Service Coverage
description: Complete list of AWS services supported by floci.io, their coverage level, and GUI status.
---

All services connect to the local floci engine on `http://localhost:4566`. Coverage level indicates how much of the real AWS API surface is emulated locally.

## Messaging & Events

| Service | GUI View | MCP Tools | Coverage | Notes |
|---|---|---|---|---|
| SQS | ✅ Native (drill-down) | 8 tools | Full | FIFO, DLQ, purge, receive/ack |
| SNS | ✅ Native (drill-down) | 8 tools | Full | FIFO, all protocols, attributes |
| EventBridge | ✅ Native | 5 tools | Full | Buses, rules, targets |
| Kinesis | ✅ Native | — | Partial | Stream CRUD, put/get records |

## Compute

| Service | GUI View | MCP Tools | Coverage | Notes |
|---|---|---|---|---|
| Lambda | ✅ Native | 8 tools | Full | All runtimes, event source mappings, logs |
| Step Functions | ✅ Native | 4 tools | Full | State machines, executions |
| ECS | ✅ Native | — | Partial | Task definitions, services |
| EKS | ✅ Native | — | Partial | Cluster listing |
| Scheduler | ✅ Native | — | Partial | EventBridge Scheduler |

## Storage

| Service | GUI View | MCP Tools | Coverage | Notes |
|---|---|---|---|---|
| S3 | ✅ Native | 8 tools | Full | Buckets, objects, versioning, presigned URLs |
| DynamoDB | ✅ Native | 8 tools | Full | Tables, items, queries, scans |
| ECR | ✅ Native | — | Partial | Repository management |
| RDS | ✅ Native | — | Partial | Instance/cluster listing |
| ElastiCache | ✅ Native | — | Partial | Cluster listing |

## Security

| Service | GUI View | MCP Tools | Coverage | Notes |
|---|---|---|---|---|
| IAM | ✅ Native | — | Partial | Users, roles, policies |
| Secrets Manager | ✅ Native | 5 tools | Full | Create, read, rotate secrets |
| KMS | ✅ Native | 5 tools | Full | Keys, encrypt/decrypt |
| ACM | ✅ Native | — | Partial | Certificate listing |
| STS | Via CLI | — | Partial | GetCallerIdentity |

## Email

| Service | GUI View | MCP Tools | Coverage | Notes |
|---|---|---|---|---|
| SES | ✅ Native | 4 tools | Full | Identities, send, quota |

## Observability

| Service | GUI View | MCP Tools | Coverage | Notes |
|---|---|---|---|---|
| CloudWatch Logs | ✅ Native | — | Full | Log groups, streams, filter |
| CloudWatch Metrics | ✅ Native | — | Partial | Metric listing, graphs |

## Analytics

| Service | GUI View | MCP Tools | Coverage | Notes |
|---|---|---|---|---|
| Athena | ✅ Native | 3 tools | Full | SQL queries, result sets |
| Glue | ✅ Native | 1 tool | Partial | Databases, tables catalog |

## Infrastructure

| Service | GUI View | MCP Tools | Coverage | Notes |
|---|---|---|---|---|
| CloudFormation | ✅ Native | — | Partial | Stack CRUD, resources |
| VPC | ✅ Native | — | Partial | VPCs, subnets, security groups |
| SSM | ✅ Native | — | Partial | Parameter Store |
| WAF | ✅ Native | — | Partial | Web ACLs |
| CodeBuild | ✅ Native | — | Partial | Project listing, builds |

## Partial coverage (CLI view)

These services have a read-only CLI-based view using `aws` commands, but no dedicated GUI:

Auto Scaling, STS (detailed), CodeArtifact, API Gateway, Route 53, CloudFront, Cognito, AppConfig, Firehose, MSK, Redshift, OpenSearch, SageMaker, Bedrock Runtime, EC2, EFS, Neptune, CloudTrail, IAM Identity Center, ELB, App Runner, Backup, Transfer (GUI available via Marketplace), CodePipeline, CodeDeploy, AppSync, AWS Batch, Transit Gateway, Elastic Beanstalk.
