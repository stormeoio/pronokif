from __future__ import annotations

from typing import Any


def feedback_query(
    *,
    q: str = "",
    category: str | None = None,
    read_status: str | None = None,
    status: str | None = None,
    priority: str | None = None,
) -> dict:
    query: dict[str, Any] = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if read_status == "read":
        query["read"] = True
    elif read_status == "unread":
        query["read"] = False
    if q.strip():
        query["$or"] = [
            {"message": {"$regex": q.strip(), "$options": "i"}},
            {"username": {"$regex": q.strip(), "$options": "i"}},
            {"user_id": {"$regex": q.strip(), "$options": "i"}},
            {"admin_note": {"$regex": q.strip(), "$options": "i"}},
        ]
    return query


def feedback_analytics_from_docs(feedbacks: list[dict]) -> dict:
    by_category: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_priority: dict[str, int] = {}
    by_user: dict[str, dict] = {}

    for feedback in feedbacks:
        category = feedback.get("category") or "feedback"
        status = feedback.get("status") or "new"
        priority = feedback.get("priority") or "normal"
        by_category[category] = by_category.get(category, 0) + 1
        by_status[status] = by_status.get(status, 0) + 1
        by_priority[priority] = by_priority.get(priority, 0) + 1

        user_id = feedback.get("user_id") or "anonymous"
        bucket = by_user.setdefault(
            user_id,
            {
                "user_id": user_id,
                "username": feedback.get("username"),
                "feedbacks_count": 0,
                "unread_count": 0,
                "last_feedback_at": None,
            },
        )
        bucket["feedbacks_count"] += 1
        if not feedback.get("read"):
            bucket["unread_count"] += 1
        current_date = str(feedback.get("created_at") or "")
        if current_date > str(bucket.get("last_feedback_at") or ""):
            bucket["last_feedback_at"] = feedback.get("created_at")

    top_submitters = sorted(
        by_user.values(),
        key=lambda row: (-row["feedbacks_count"], -row["unread_count"], str(row.get("username") or "")),
    )[:10]

    return {
        "summary": {
            "total": len(feedbacks),
            "unread": len([feedback for feedback in feedbacks if not feedback.get("read")]),
            "read": len([feedback for feedback in feedbacks if feedback.get("read")]),
            "bugs": by_category.get("bug", 0),
            "suggestions": by_category.get("suggestion", 0),
            "feedback": by_category.get("feedback", 0),
            "high_priority": by_priority.get("high", 0) + by_priority.get("urgent", 0),
        },
        "by_category": by_category,
        "by_status": by_status,
        "by_priority": by_priority,
        "top_submitters": top_submitters,
    }
