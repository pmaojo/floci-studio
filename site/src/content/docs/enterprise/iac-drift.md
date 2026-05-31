---
title: IaC Drift Detection
description: Auto-discover Terraform/Serverless/CDK resources and detect drift between your code and the local emulator.
---

Floci keeps your Infrastructure-as-Code and the local emulator in sync by
comparing what your repository **declares** against what actually **exists** in
the emulator.

## Auto-discovery

Point Floci at a path (a repo root or a specific file) and it recursively scans for:

- `terraform.tfstate` / `*.tfstate` — parsed for managed resources.
- `floci-resources.json` — a generic `[{ "type", "name" }, …]` list you can export
  from Serverless Framework or CDK synth steps.

Supported Terraform resource types map to Floci categories: `aws_s3_bucket`,
`aws_sqs_queue`, `aws_dynamodb_table`, `aws_lambda_function`, `aws_sns_topic`,
`aws_kms_key`.

## Drift detection

The drift report classifies every resource into three buckets:

| Bucket | Meaning |
|---|---|
| **managed** | Declared in IaC **and** present in the emulator — in sync. |
| **missing** | Declared in IaC but **absent** from the emulator. |
| **unmanaged** | Exists in the emulator but **not** in your code — created manually (drift). |

The cockpit highlights an **In Sync** / **Drift Detected** banner and lists each
bucket. KMS keys are excluded from name comparison because their IDs are generated.

## Code generation from the UI

Drift detection pairs with Floci's existing IaC export
(`GET /api/extensions/export-iac?format=terraform`). When you spot an *unmanaged*
resource, export the equivalent Terraform/CDK block and commit it to bring the
resource back under management.

| Layer | Entry point |
|---|---|
| GUI | `/studio/drift` |
| REST | `GET /api/iac/discover?path=…`, `GET /api/iac/drift?path=…` |
| MCP | `discover_iac_resources`, `detect_iac_drift`, plus `export_to_terraform` |
