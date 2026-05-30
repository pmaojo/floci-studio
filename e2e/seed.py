#!/usr/bin/env python3
"""Seed the Floci emulator with realistic, interconnected AWS resources.

The goal is a demo-grade dataset: every Floci Studio view that has a dedicated
screen should render something believable — named buckets with objects, tables
with rows, queues with in-flight messages, KMS keys with aliases, Lambda
functions, IAM roles, log groups with events, EC2 instances, and so on.

Each service is seeded independently and wrapped in try/except so that a
service moto happens not to support never aborts the whole run. A summary is
printed at the end.

    python e2e/seed.py            # seeds against http://localhost:4566
"""
from __future__ import annotations

import io
import json
import os
import zipfile
from datetime import datetime, timezone

import boto3
from botocore.config import Config

ENDPOINT = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

_BOTO = Config(retries={"max_attempts": 2}, region_name=REGION)
_CREDS = dict(aws_access_key_id="test", aws_secret_access_key="test")

results: list[tuple[str, str, str]] = []  # (service, status, detail)


def client(service: str):
    return boto3.client(service, endpoint_url=ENDPOINT, config=_BOTO, **_CREDS)


def step(service: str):
    """Tag a seeder with its service name; execution happens in main()."""
    def deco(fn):
        fn._service = service  # type: ignore[attr-defined]
        return fn
    return deco


def run(fn):
    service = getattr(fn, "_service", fn.__name__)
    try:
        detail = fn()
        results.append((service, "OK", detail or ""))
    except Exception as exc:  # noqa: BLE001 — demo seeder, keep going
        results.append((service, "SKIP", f"{type(exc).__name__}: {exc}"[:120]))


# ─────────────────────────────────────────────────────────────────────────────
@step("S3")
def seed_s3():
    s3 = client("s3")
    buckets = {
        "floci-app-uploads": [
            ("invoices/2026-05/INV-1042.pdf", b"%PDF-1.4 floci demo invoice"),
            ("invoices/2026-05/INV-1043.pdf", b"%PDF-1.4 floci demo invoice"),
            ("avatars/u-204.png", b"\x89PNG\r\n demo"),
        ],
        "floci-data-lake": [
            ("events/dt=2026-05-30/part-0001.json", b'{"event":"signup","user":204}'),
            ("events/dt=2026-05-30/part-0002.json", b'{"event":"purchase","user":118}'),
        ],
        "floci-static-site": [
            ("index.html", b"<h1>Floci</h1>"),
            ("style.css", b"body{font-family:monospace}"),
        ],
        "floci-terraform-state": [
            ("env/prod/terraform.tfstate", b'{"version":4,"serial":7}'),
        ],
    }
    for name, objects in buckets.items():
        s3.create_bucket(Bucket=name)
        for key, body in objects:
            s3.put_object(Bucket=name, Key=key, Body=body)
    return f"{len(buckets)} buckets, {sum(len(o) for o in buckets.values())} objects"


@step("DynamoDB")
def seed_dynamodb():
    ddb = client("dynamodb")
    ddb.create_table(
        TableName="floci-users",
        AttributeDefinitions=[{"AttributeName": "userId", "AttributeType": "S"}],
        KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
        BillingMode="PAY_PER_REQUEST",
    )
    users = [
        {"userId": {"S": "u-204"}, "email": {"S": "ada@floci.dev"}, "plan": {"S": "pro"}, "active": {"BOOL": True}},
        {"userId": {"S": "u-118"}, "email": {"S": "linus@floci.dev"}, "plan": {"S": "free"}, "active": {"BOOL": True}},
        {"userId": {"S": "u-991"}, "email": {"S": "grace@floci.dev"}, "plan": {"S": "enterprise"}, "active": {"BOOL": False}},
    ]
    for item in users:
        ddb.put_item(TableName="floci-users", Item=item)

    ddb.create_table(
        TableName="floci-orders",
        AttributeDefinitions=[
            {"AttributeName": "orderId", "AttributeType": "S"},
            {"AttributeName": "userId", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "orderId", "KeyType": "HASH"},
            {"AttributeName": "userId", "KeyType": "RANGE"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    for i in range(1, 6):
        ddb.put_item(
            TableName="floci-orders",
            Item={
                "orderId": {"S": f"ord-{1000 + i}"},
                "userId": {"S": "u-204" if i % 2 else "u-118"},
                "amountUsd": {"N": str(19 * i)},
                "status": {"S": "paid" if i % 2 else "pending"},
            },
        )
    return "2 tables (floci-users, floci-orders), 8 items"


@step("SQS")
def seed_sqs():
    sqs = client("sqs")
    urls = {}
    for q in ["floci-jobs", "floci-emails", "floci-dlq.fifo"]:
        attrs = {"FifoQueue": "true"} if q.endswith(".fifo") else {}
        urls[q] = sqs.create_queue(QueueName=q, Attributes=attrs)["QueueUrl"]
    for i in range(4):
        sqs.send_message(QueueUrl=urls["floci-jobs"], MessageBody=json.dumps({"job": "resize", "id": i}))
    sqs.send_message(QueueUrl=urls["floci-emails"], MessageBody=json.dumps({"to": "ada@floci.dev", "template": "welcome"}))
    return "3 queues, 5 messages"


@step("SNS")
def seed_sns():
    sns = client("sns")
    for t in ["floci-alerts", "floci-billing", "floci-deploys"]:
        arn = sns.create_topic(Name=t)["TopicArn"]
        sns.subscribe(TopicArn=arn, Protocol="email", Endpoint=f"ops+{t}@floci.dev")
    return "3 topics, 3 subscriptions"


@step("KMS")
def seed_kms():
    kms = client("kms")
    for alias, desc in [
        ("alias/floci-app-secrets", "Application secrets envelope key"),
        ("alias/floci-rds-encryption", "RDS storage encryption key"),
        ("alias/floci-s3-default", "Default S3 bucket SSE key"),
    ]:
        key = kms.create_key(Description=desc, KeyUsage="ENCRYPT_DECRYPT")
        kms.create_alias(AliasName=alias, TargetKeyId=key["KeyMetadata"]["KeyId"])
    return "3 keys with aliases"


@step("SecretsManager")
def seed_secrets():
    sm = client("secretsmanager")
    secrets = {
        "floci/prod/database": {"username": "floci", "password": "s3cr3t-demo", "host": "db.floci.internal"},
        "floci/prod/stripe-api-key": {"apiKey": "sk_live_demo_4242"},
        "floci/prod/jwt-signing": {"kid": "2026-05", "alg": "RS256"},
    }
    for name, value in secrets.items():
        sm.create_secret(Name=name, SecretString=json.dumps(value))
    return f"{len(secrets)} secrets"


@step("IAM")
def seed_iam():
    iam = client("iam")
    assume = {
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}],
    }
    for role in ["floci-lambda-exec", "floci-api-task-role", "floci-ci-deploy"]:
        iam.create_role(RoleName=role, AssumeRolePolicyDocument=json.dumps(assume))
    for user in ["floci-ci", "floci-readonly"]:
        iam.create_user(UserName=user)
    iam.create_policy(
        PolicyName="floci-s3-readonly",
        PolicyDocument=json.dumps(
            {"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": ["s3:Get*", "s3:List*"], "Resource": "*"}]}
        ),
    )
    return "3 roles, 2 users, 1 policy"


def _lambda_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("index.py", "def handler(event, context):\n    return {'ok': True}\n")
    return buf.getvalue()


@step("Lambda")
def seed_lambda():
    lam = client("lambda")
    # Use the real ARN of the role seeded into IAM so the emulator's
    # cross-account pass-role check is satisfied.
    role_arn = client("iam").get_role(RoleName="floci-lambda-exec")["Role"]["Arn"]
    code = _lambda_zip()
    fns = [
        ("floci-image-resizer", "python3.12", 256),
        ("floci-order-processor", "python3.12", 512),
        ("floci-webhook-handler", "python3.11", 128),
    ]
    for name, runtime, mem in fns:
        lam.create_function(
            FunctionName=name,
            Runtime=runtime,
            Role=role_arn,
            Handler="index.handler",
            Code={"ZipFile": code},
            MemorySize=mem,
            Timeout=30,
            Publish=True,
        )
    return f"{len(fns)} functions"


@step("CloudWatchLogs")
def seed_logs():
    logs = client("logs")
    now = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    for fn in ["floci-image-resizer", "floci-order-processor"]:
        group = f"/aws/lambda/{fn}"
        logs.create_log_group(logGroupName=group)
        stream = "2026/05/30/[$LATEST]demo"
        logs.create_log_stream(logGroupName=group, logStreamName=stream)
        logs.put_log_events(
            logGroupName=group,
            logStreamName=stream,
            logEvents=[
                {"timestamp": now - 3000, "message": "START RequestId: demo-1 Version: $LATEST"},
                {"timestamp": now - 2000, "message": "INFO processed event successfully"},
                {"timestamp": now - 1000, "message": "END RequestId: demo-1"},
            ],
        )
    return "2 log groups with events"


@step("EC2")
def seed_ec2():
    ec2 = client("ec2")
    vpc = ec2.create_vpc(CidrBlock="10.42.0.0/16")["Vpc"]["VpcId"]
    ec2.create_tags(Resources=[vpc], Tags=[{"Key": "Name", "Value": "floci-prod-vpc"}])
    subnet = ec2.create_subnet(VpcId=vpc, CidrBlock="10.42.1.0/24")["Subnet"]["SubnetId"]
    sg = ec2.create_security_group(GroupName="floci-web-sg", Description="web tier", VpcId=vpc)["GroupId"]
    amis = ec2.describe_images()["Images"]
    ami = amis[0]["ImageId"] if amis else "ami-12345678"
    ec2.run_instances(
        ImageId=ami, MinCount=2, MaxCount=2, InstanceType="t3.micro",
        SubnetId=subnet, SecurityGroupIds=[sg],
        TagSpecifications=[{"ResourceType": "instance", "Tags": [{"Key": "Name", "Value": "floci-api"}]}],
    )
    return "1 VPC, 1 subnet, 1 SG, 2 instances"


@step("ECR")
def seed_ecr():
    ecr = client("ecr")
    for repo in ["floci/api", "floci/worker", "floci/web"]:
        ecr.create_repository(repositoryName=repo)
    return "3 repositories"


@step("Kinesis")
def seed_kinesis():
    k = client("kinesis")
    for s in ["floci-clickstream", "floci-telemetry"]:
        k.create_stream(StreamName=s, ShardCount=2)
    return "2 streams"


@step("SSM")
def seed_ssm():
    ssm = client("ssm")
    params = {
        "/floci/prod/api/base-url": "https://api.floci.dev",
        "/floci/prod/feature-flags/new-billing": "true",
        "/floci/staging/api/base-url": "https://staging.api.floci.dev",
    }
    for name, value in params.items():
        ssm.put_parameter(Name=name, Value=value, Type="String", Overwrite=True)
    return f"{len(params)} parameters"


@step("EventBridge")
def seed_events():
    eb = client("events")
    eb.put_rule(Name="floci-nightly-billing", ScheduleExpression="cron(0 2 * * ? *)", State="ENABLED")
    eb.put_rule(Name="floci-on-order-paid", EventPattern=json.dumps({"source": ["floci.orders"]}), State="ENABLED")
    return "2 rules"


@step("StepFunctions")
def seed_sfn():
    sfn = client("stepfunctions")
    definition = {
        "Comment": "Floci order fulfillment",
        "StartAt": "Validate",
        "States": {
            "Validate": {"Type": "Pass", "Next": "Charge"},
            "Charge": {"Type": "Pass", "Next": "Ship"},
            "Ship": {"Type": "Pass", "End": True},
        },
    }
    sfn.create_state_machine(
        name="floci-order-fulfillment",
        definition=json.dumps(definition),
        roleArn="arn:aws:iam::000000000000:role/floci-lambda-exec",
    )
    return "1 state machine"


@step("Scheduler")
def seed_scheduler():
    sch = client("scheduler")
    sch.create_schedule(
        Name="floci-daily-report",
        ScheduleExpression="rate(1 day)",
        FlexibleTimeWindow={"Mode": "OFF"},
        Target={"Arn": "arn:aws:lambda:us-east-1:000000000000:function:floci-order-processor",
                "RoleArn": "arn:aws:iam::000000000000:role/floci-lambda-exec"},
    )
    return "1 schedule"


@step("SES")
def seed_ses():
    ses = client("ses")
    for ident in ["floci.dev", "ops@floci.dev", "no-reply@floci.dev"]:
        ses.verify_email_identity(EmailAddress=ident) if "@" in ident else ses.verify_domain_identity(Domain=ident)
    return "3 identities"


@step("Glue")
def seed_glue():
    glue = client("glue")
    glue.create_database(DatabaseInput={"Name": "floci_analytics"})
    return "1 database"


def main():
    print(f"[seed] endpoint={ENDPOINT} region={REGION}")
    for fn in [
        seed_s3, seed_dynamodb, seed_sqs, seed_sns, seed_kms, seed_secrets,
        seed_iam, seed_lambda, seed_logs, seed_ec2, seed_ecr, seed_kinesis,
        seed_ssm, seed_events, seed_sfn, seed_scheduler, seed_ses, seed_glue,
    ]:
        run(fn)

    print("\n=== Seed summary ===")
    ok = sum(1 for _, s, _ in results if s == "OK")
    for service, status, detail in results:
        mark = "✓" if status == "OK" else "✗"
        print(f"  {mark} {service:<16} {detail}")
    print(f"\n{ok}/{len(results)} services seeded.")


if __name__ == "__main__":
    main()
