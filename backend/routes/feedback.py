"""
PRONOKIF - Feedback routes.

POST /feedback                        — any authenticated user
GET  /admin/feedback                  — admin only
PUT  /admin/feedback/{id}/read        — admin only

The router has no path prefix because the admin endpoints share the
/admin/... namespace with other admin routers; we let server.py mount
this with prefix="/api" and the paths above are absolute under /api.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from services import feedback as feedback_service
from services.admin import require_admin
from services.auth import get_current_user

router = APIRouter(tags=["feedback"])


class FeedbackCreate(BaseModel):
    category: str = Field(..., description="One of: bug, suggestion, feedback")
    message: str = Field(..., min_length=1, max_length=2000)


@router.post("/feedback")
async def submit_feedback(data: FeedbackCreate, user: dict = Depends(get_current_user)) -> dict:
    """Submit feedback to admin."""
    try:
        feedback = await feedback_service.submit(user=user, message=data.message, category=data.category)
    except feedback_service.FeedbackValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"message": "Feedback submitted successfully", "id": feedback["id"]}


@router.get("/admin/feedback")
async def get_all_feedback(_admin: dict = Depends(require_admin)) -> list[dict]:
    """List all feedback entries (admin only)."""
    return await feedback_service.list_all()


@router.put("/admin/feedback/{feedback_id}/read")
async def mark_feedback_read(feedback_id: str, _admin: dict = Depends(require_admin)) -> dict:
    """Mark a feedback entry as read (admin only)."""
    if not await feedback_service.mark_read(feedback_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback introuvable")
    return {"message": "Feedback marqué comme lu"}
