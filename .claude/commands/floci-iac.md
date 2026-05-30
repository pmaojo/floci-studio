# Floci Studio — IaC Export

Export the current local AWS resources to infrastructure-as-code using `export_to_terraform`.

## Arguments

`$ARGUMENTS`: `terraform` (default) or `cdk`

## Steps

1. Call `list_aws_services` to confirm there are resources to export.
2. Call `export_to_terraform` with `format` set to the requested format (`terraform` or `cdk`).
3. Present the generated code in a fenced code block with the correct language tag (`hcl` for Terraform, `typescript` for CDK).
4. List which resource types were exported (S3, SQS, DynamoDB, Lambda, KMS) and note any that were skipped due to having no resources.

## Bonus: AWS CLI proxy

If `$ARGUMENTS` starts with `aws ` or looks like an aws-cli command, call `run_local_aws_cmd` instead:
- Strip the leading `aws ` prefix if present
- Pass the remainder as `command`
- Format the response as a code block

Example: `/floci-iac s3 ls` → calls `run_local_aws_cmd("s3 ls")`
