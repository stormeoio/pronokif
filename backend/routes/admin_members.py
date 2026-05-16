"""
PRONOKIF - Admin members management routes.

GET    /admin/members                       — list all members (admin only)
GET    /admin/members/{member_id}           — member detailed profile
GET    /admin/members/{member_id}/activity  — member login activity
DELETE /admin/members/{member_id}           — delete member + cascade cleanup

The router has no path prefix because the admin endpoints share the
/admin/... namespace with other admin routers; server.py mounts this
with prefix="/api" so the paths above are absolute under /api.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from services import admin_members as admin_members_service
from services.admin import require_admin


router = APIRouter(tags=["admin-members"])


@router.get("/admin/members")
async def get_all_members(_admin=Depends(require_admin)):
    """List all registered members enriched with prediction + league counts."""
    return await admin_members_service.list_all()


@router.get("/admin/members/{member_id}")
async def get_member_details(member_id: str, _admin=Depends(require_admin)):
    """Detailed profile of a specific member."""
    try:
        return await admin_members_service.get_details(member_id)
    except admin_members_service.MemberNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        ) from exc


@router.get("/admin/members/{member_id}/activity")
async def get_member_activity(member_id: str, _admin=Depends(require_admin)):
    """Login activity history for a specific member."""
    try:
        return await admin_members_service.get_activity(member_id)
    except admin_members_service.MemberNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        ) from exc


@router.delete("/admin/members/{member_id}")
async def delete_member(member_id: str, admin=Depends(require_admin)):
    """Delete a member account and cascade-cleanup all their data."""
    try:
        return await admin_members_service.delete(
            member_id, acting_admin_id=admin["id"]
        )
    except admin_members_service.CannotDeleteSelfError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except admin_members_service.MemberNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        ) from exc
