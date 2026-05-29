"""Pure helpers for admin invitation operations."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def parse_iso_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if not value:
        return None
    try:
        text = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except ValueError:
        return None


def invitation_status(invitation: dict, now: datetime | None = None) -> str:
    if invitation.get("revoked"):
        return "revoked"
    if invitation.get("accepted"):
        return "accepted"
    expires_at = parse_iso_datetime(invitation.get("expires_at"))
    if expires_at and expires_at < (now or datetime.now(UTC)):
        return "expired"
    return "pending"


def invitation_registration_error(invitation: dict | None, *, email: str, now: datetime | None = None) -> str | None:
    """Return a user-facing registration error, or None when an invite is usable."""
    if not invitation:
        return "Invitation introuvable"

    status = invitation_status(invitation, now=now)
    if status == "accepted":
        return "Invitation déjà acceptée"
    if status == "revoked":
        return "Invitation révoquée"
    if status == "expired":
        return "Invitation expirée"

    invited_email = str(invitation.get("email") or "").strip().lower()
    if invited_email and invited_email != email.strip().lower():
        return "Cette invitation est associée à un autre email"
    return None


def invitation_payload(invitation: dict, now: datetime | None = None) -> dict:
    return {
        **invitation,
        "status": invitation_status(invitation, now=now),
        "token": None,
    }


def invitation_search_query(search: str = "", sent_by: str | None = None) -> dict:
    query: dict[str, Any] = {}
    if sent_by:
        query["sent_by"] = sent_by
    if search.strip():
        value = search.strip()
        query["$or"] = [
            {"email": {"$regex": value, "$options": "i"}},
            {"sent_by": {"$regex": value, "$options": "i"}},
            {"message": {"$regex": value, "$options": "i"}},
            {"admin_note": {"$regex": value, "$options": "i"}},
        ]
    return query


def invitation_analytics_from_docs(invitations: list[dict], now: datetime | None = None) -> dict:
    by_status: dict[str, int] = {}
    by_sender: dict[str, dict] = {}
    rows = [invitation_payload(invitation, now=now) for invitation in invitations]

    for invitation in rows:
        status = invitation["status"]
        by_status[status] = by_status.get(status, 0) + 1
        sender = invitation.get("sent_by") or "unknown"
        bucket = by_sender.setdefault(
            sender,
            {"sent_by": sender, "total": 0, "accepted": 0, "pending": 0, "expired": 0, "revoked": 0},
        )
        bucket["total"] += 1
        bucket[status] = bucket.get(status, 0) + 1

    senders = sorted(by_sender.values(), key=lambda row: (-row["total"], str(row["sent_by"])))[:10]
    total = len(rows)
    accepted = by_status.get("accepted", 0)

    return {
        "summary": {
            "total": total,
            "pending": by_status.get("pending", 0),
            "accepted": accepted,
            "expired": by_status.get("expired", 0),
            "revoked": by_status.get("revoked", 0),
            "acceptance_rate": round((accepted / total) * 100, 1) if total else 0,
        },
        "by_status": by_status,
        "by_sender": senders,
    }
