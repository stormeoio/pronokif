"""
PRONOKIF - Admin sync / reminders routes (S1 lot 7).

All endpoints are admin-only via ``services.admin.require_admin``:

* POST /admin/sync-results/{race_id}        — preview sync from APIs
* POST /admin/send-reminders                — notify late users
* POST /admin/auto-sync-results/{race_id}   — sync + persist + score
* POST /admin/sync-all-pending              — bulk sync past races
* GET  /admin/sync-status                   — auto-sync state snapshot

The router has no prefix — server.py mounts it under ``/api`` like the
other modular routers.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from services import sync as sync_service
from services.admin import require_admin

router = APIRouter(tags=["admin-sync"])


@router.post("/admin/sync-results/{race_id}")
async def sync_results_from_openf1(race_id: str, user: dict = Depends(require_admin)) -> dict:
    """Fetch quali / race / sprint / safety car / fastest lap (no DB write)."""
    try:
        return await sync_service.sync_one_race(race_id, user["id"])
    except sync_service.RaceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course introuvable") from exc


@router.post("/admin/send-reminders")
async def send_reminder_notifications(_admin: dict = Depends(require_admin)) -> dict:
    """Send reminders to users that have not pronostiqued for a race closing in ~24h."""
    return await sync_service.send_reminders()


@router.post("/admin/auto-sync-results/{race_id}")
async def auto_sync_and_save_results(race_id: str, user: dict = Depends(require_admin)) -> dict:
    """Fetch external API results, persist them, recompute points, notify users."""
    try:
        return await sync_service.auto_sync_and_save(race_id, user["id"])
    except sync_service.RaceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course introuvable") from exc


@router.post("/admin/sync-all-pending")
async def sync_all_pending_races(_admin: dict = Depends(require_admin)) -> dict:
    """Manually trigger sync for all past races without results."""
    return await sync_service.sync_all_pending()


@router.post("/admin/resync-all-past")
async def resync_all_past_races(admin: dict = Depends(require_admin)) -> dict:
    """Force re-sync + re-score ALL past races (even if results already exist).

    Use after fixing driver mappings or scoring logic to recompute everything.
    """
    from data.f1_data import active_2026_races
    from datetime import datetime, UTC

    now = datetime.now(UTC)
    results = []
    for race in active_2026_races():
        if race.get("is_cancelled"):
            continue
        race_start = race.get("race_start_at") or race.get("date")
        if not race_start:
            continue
        if isinstance(race_start, str):
            from datetime import datetime as dt
            try:
                race_dt = dt.fromisoformat(race_start.replace("Z", "+00:00"))
            except ValueError:
                continue
        else:
            race_dt = race_start
        if race_dt.tzinfo is None:
            race_dt = race_dt.replace(tzinfo=UTC)
        if race_dt > now:
            continue
        try:
            r = await sync_service.auto_sync_and_save(race["id"], admin["id"])
            results.append({"race": race["name"], "status": r.get("status"), "points": r.get("points_calculated")})
        except Exception as e:
            results.append({"race": race["name"], "status": "error", "error": str(e)})
    return {"message": f"Re-synced {len(results)} past races", "results": results}


@router.get("/admin/sync-status")
async def get_sync_status(_admin: dict = Depends(require_admin)) -> dict:
    """Return the auto-sync state for every race in the calendar."""
    return await sync_service.sync_status()
