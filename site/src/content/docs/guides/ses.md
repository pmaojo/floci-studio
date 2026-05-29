---
title: SES — Email
description: Verify email identities, send emails, and track send quota in Floci Studio.
---

SES in Floci Studio provides a native interface for managing email identities, sending test emails, and monitoring your send quota — useful for testing email flows without hitting real mail servers.

## Verified identities

Before sending, SES requires a verified sender identity. In local emulation, verification is instant.

1. Click **SES** in the sidebar.
2. Click **Verify Address**.
3. Enter an email address (e.g., `dev@example.com`).
4. Click Verify.

The identity appears in the list with a **Verified** badge immediately.

## Send quota

The top bar shows your quota stats:
- **Quota 24h** — maximum emails per day
- **Sent 24h** — emails sent in the last 24 hours
- **Rate** — maximum messages per second
- **Verified** — count of verified identities

## Sending a test email

Click **Send Email** in the header. Fill in:
- **From** — must be a verified identity
- **To** — any address
- **Subject**
- **Body**

Click **Send Email**. The event stream logs the call with `SES.SendEmail`.

In local emulation, emails are captured and visible in [Mailpit](http://localhost:8025) if you have that marketplace recipe running.

## Managing identities

Hover any identity row to reveal action buttons:
- **Send** (arrow icon) — opens the send modal with this address pre-filled as From
- **Delete** (trash icon) — removes the identity

## SDK integration

```python
import boto3

ses = boto3.client("ses", endpoint_url="http://localhost:4566",
                   region_name="us-east-1",
                   aws_access_key_id="test", aws_secret_access_key="test")

# Verify an identity
ses.verify_email_identity(EmailAddress="dev@example.com")

# Send an email
ses.send_email(
    Source="dev@example.com",
    Destination={"ToAddresses": ["user@acme.com"]},
    Message={
        "Subject": {"Data": "Order confirmed", "Charset": "UTF-8"},
        "Body": {"Text": {"Data": "Your order #4419 is confirmed.", "Charset": "UTF-8"}},
    },
)

# Get quota
quota = ses.get_send_quota()
print(f"Sent: {quota['SentLast24Hours']} / {quota['Max24HourSend']}")
```

## Pairing with Mailpit

Deploy the Mailpit recipe from the Marketplace to capture all outgoing emails in a browser-based inbox:

1. Go to **Marketplace** in the sidebar.
2. Find **Mailpit (SMTP)** and click Deploy.
3. Open `http://localhost:8025` — all emails sent via SES appear here.
