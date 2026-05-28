"""
One-shot script: send festive admin launch email for pronokif.eu beta.
Usage: python scripts/send_admin_launch_email.py --to fred@stormeo.io [--dry-run]
       python scripts/send_admin_launch_email.py --to fred@stormeo.io --smtp-pass "xxx"
"""

import argparse
import os
import smtplib
import ssl
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

# Add backend root to path so we can import services
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "pronokif")

from services.email_templates import admin_launch  # noqa: E402

SMTP_HOST = "mail.infomaniak.com"
SMTP_PORT = 587
SMTP_USER = "support@stormeo.io"
SMTP_FROM = "support@stormeo.io"
SMTP_FROM_NAME = "PronoKif"


def send(to_email: str, dry_run: bool = False, smtp_pass: str | None = None):
    tpl = admin_launch()

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    msg["To"] = to_email
    msg["Subject"] = tpl.subject

    msg.attach(MIMEText(tpl.text, "plain", "utf-8"))
    msg.attach(MIMEText(tpl.html_body, "html", "utf-8"))

    if dry_run:
        preview_path = "/tmp/pronokif-admin-launch-preview.html"
        with open(preview_path, "w") as f:
            f.write(tpl.html_body)
        print(f"[DRY RUN] Preview: {preview_path}")
        print(f"[DRY RUN] To: {to_email}")
        print(f"[DRY RUN] Subject: {tpl.subject}")
        return True

    if not smtp_pass:
        smtp_pass = os.environ.get("SMTP_PASS")
    if not smtp_pass:
        print("ERROR: SMTP_PASS required. Use --smtp-pass or SMTP_PASS env var.")
        return False

    ctx = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=ctx)
            server.login(SMTP_USER, smtp_pass)
            server.send_message(msg)
    except ssl.SSLCertVerificationError:
        # macOS Python may lack system certs — retry without strict verify
        ctx = ssl._create_unverified_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=ctx)
            server.login(SMTP_USER, smtp_pass)
            server.send_message(msg)

    print(f"Email sent to {to_email}")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send admin launch email")
    parser.add_argument("--to", required=True, help="Recipient email")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--smtp-pass", help="SMTP password")
    args = parser.parse_args()

    ok = send(args.to, dry_run=args.dry_run, smtp_pass=args.smtp_pass)
    sys.exit(0 if ok else 1)
