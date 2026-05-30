#!/usr/bin/env python3
"""Local AWS emulator for the Floci Studio E2E harness.

Floci Studio normally talks to the Floci engine container (``floci/floci``)
exposed on ``:4566``. In CI or sandboxed environments where that image cannot
be pulled, this script stands in for it: it serves a real, in-memory
AWS-compatible API (backed by `moto`) on the same port and protocol the GUI
expects.

The Floci GUI checks emulator health with a LocalStack-style request to
``/_localstack/health``. `moto` does not implement that route, so we wrap the
moto WSGI app and answer ``/_localstack/health`` ourselves, delegating every
other request (the signed AWS SDK calls) straight to moto.

Run it standalone:

    python e2e/emulator.py            # listens on 0.0.0.0:4566

Everything is in-memory; stop the process to reset state.
"""
from __future__ import annotations

import json
import os

from moto.moto_server.werkzeug_app import DomainDispatcherApplication, create_backend_app
from werkzeug.serving import run_simple

HEALTH_PATH = "/_localstack/health"

# Services we advertise as "running" in the LocalStack-style health payload so
# the GUI lights up every capability tile. moto emulates all of these.
ADVERTISED_SERVICES = [
    "s3", "dynamodb", "sqs", "sns", "lambda", "kms", "iam", "sts",
    "secretsmanager", "logs", "cloudwatch", "events", "ec2", "ecr",
    "ecs", "rds", "kinesis", "cloudformation", "ssm", "stepfunctions",
    "acm", "elasticache", "glue", "scheduler", "ses", "wafv2",
]


def _health_response(start_response):
    body = json.dumps(
        {
            "services": {name: "running" for name in ADVERTISED_SERVICES},
            "edition": "floci-e2e-emulator",
            "version": "moto-backed",
        }
    ).encode()
    start_response(
        "200 OK",
        [
            ("Content-Type", "application/json"),
            ("Content-Length", str(len(body))),
            ("Access-Control-Allow-Origin", "*"),
        ],
    )
    return [body]


def build_app():
    """Return a WSGI app: health route + moto fallthrough."""
    moto_app = DomainDispatcherApplication(create_backend_app)

    def application(environ, start_response):
        if environ.get("PATH_INFO", "") == HEALTH_PATH:
            return _health_response(start_response)
        return moto_app(environ, start_response)

    return application


def main():
    host = os.getenv("FLOCI_EMULATOR_HOST", "0.0.0.0")
    port = int(os.getenv("FLOCI_EMULATOR_PORT", "4566"))
    print(f"[floci-emulator] moto-backed AWS API on http://{host}:{port}")
    print(f"[floci-emulator] health route: http://{host}:{port}{HEALTH_PATH}")
    run_simple(host, port, build_app(), threaded=True)


if __name__ == "__main__":
    main()
