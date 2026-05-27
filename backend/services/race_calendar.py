"""
Editable 2026 race calendar helpers.

The static `data.f1_data` module still contains legacy race metadata. This
service exposes the active 2026 programme used by the back-office and automatic
result sync: 24 races, with Madrid added and Imola excluded.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from data.f1_data import F1_RACES_2026

DEFAULT_RACE_DURATION_MINUTES = 120
LEGACY_CALENDAR_TIMEZONE = "Europe/Paris"

CIRCUIT_TIMEZONES = {
    "Albert Park": "Australia/Melbourne",
    "Shanghai": "Asia/Shanghai",
    "Suzuka": "Asia/Tokyo",
    "Sakhir": "Asia/Bahrain",
    "Jeddah": "Asia/Riyadh",
    "Miami": "America/New_York",
    "Monaco": "Europe/Monaco",
    "Barcelona": "Europe/Madrid",
    "Montreal": "America/Toronto",
    "Red Bull Ring": "Europe/Vienna",
    "Silverstone": "Europe/London",
    "Spa-Francorchamps": "Europe/Brussels",
    "Hungaroring": "Europe/Budapest",
    "Zandvoort": "Europe/Amsterdam",
    "Monza": "Europe/Rome",
    "Madrid": "Europe/Madrid",
    "Baku": "Asia/Baku",
    "Marina Bay": "Asia/Singapore",
    "COTA": "America/Chicago",
    "Hermanos Rodríguez": "America/Mexico_City",
    "Interlagos": "America/Sao_Paulo",
    "Las Vegas": "America/Los_Angeles",
    "Lusail": "Asia/Qatar",
    "Yas Marina": "Asia/Dubai",
}

SESSION_TIME_FIELDS = (
    ("date", "race_time"),
    ("quali_date", "quali_time"),
    ("fp1_date", "fp1_time"),
    ("fp2_date", "fp2_time"),
    ("fp3_date", "fp3_time"),
    ("sprint_quali_date", "sprint_quali_time"),
    ("sprint_race_date", "sprint_race_time"),
)

ACTIVE_2026_RACE_ORDER = [
    ("australia-2026", "2026-03-08", "2026-03-07"),
    ("china-2026", "2026-03-15", "2026-03-13"),
    ("japan-2026", "2026-03-29", "2026-03-28"),
    ("bahrain-2026", "2026-04-12", "2026-04-11"),
    ("saudi-2026", "2026-04-19", "2026-04-18"),
    ("miami-2026", "2026-05-03", "2026-05-01"),
    ("canada-2026", "2026-05-24", "2026-05-23"),
    ("monaco-2026", "2026-06-07", "2026-06-06"),
    ("spain-2026", "2026-06-14", "2026-06-13"),
    ("austria-2026", "2026-06-28", "2026-06-26"),
    ("silverstone-2026", "2026-07-05", "2026-07-04"),
    ("belgium-2026", "2026-07-19", "2026-07-18"),
    ("hungary-2026", "2026-07-26", "2026-07-25"),
    ("netherlands-2026", "2026-08-23", "2026-08-22"),
    ("monza-2026", "2026-09-06", "2026-09-05"),
    ("madrid-2026", "2026-09-13", "2026-09-12"),
    ("azerbaijan-2026", "2026-09-26", "2026-09-25"),
    ("singapore-2026", "2026-10-11", "2026-10-10"),
    ("austin-2026", "2026-10-25", "2026-10-23"),
    ("mexico-2026", "2026-11-01", "2026-10-31"),
    ("brazil-2026", "2026-11-08", "2026-11-06"),
    ("vegas-2026", "2026-11-21", "2026-11-20"),
    ("qatar-2026", "2026-11-29", "2026-11-27"),
    ("abudhabi-2026", "2026-12-06", "2026-12-05"),
]

ACTIVE_2026_CALENDAR_OVERRIDES = {
    race_id: {"date": date, "quali_date": quali_date, "round_number": index}
    for index, (race_id, date, quali_date) in enumerate(ACTIVE_2026_RACE_ORDER, start=1)
}

CANCELLED_2026_RACE_IDS = {"bahrain-2026", "saudi-2026"}


def active_2026_races() -> list[dict]:
    static_races_by_id = {race["id"]: race for race in F1_RACES_2026}
    races = []
    for race_id, _, _ in ACTIVE_2026_RACE_ORDER:
        race = static_races_by_id.get(race_id)
        if not race:
            continue
        race = race_with_circuit_timezone(
            {
                **race,
                **ACTIVE_2026_CALENDAR_OVERRIDES[race_id],
            }
        )
        races.append(
            {
                **race,
                "is_cancelled": race_id in CANCELLED_2026_RACE_IDS,
            }
        )
    return races


def syncable_2026_races() -> list[dict]:
    """Races that should be polled for official results and reminders."""
    return [race for race in active_2026_races() if not race.get("is_cancelled")]


def race_timezone(race: dict) -> ZoneInfo:
    """Return the circuit timezone, falling back to Paris if the value is invalid."""
    try:
        return ZoneInfo(race.get("timezone") or "Europe/Paris")
    except ZoneInfoNotFoundError:
        return ZoneInfo("Europe/Paris")


def _time_with_seconds(time_value: str) -> str:
    return f"{time_value}:00" if len(str(time_value).split(":")) == 2 else str(time_value)


def _convert_legacy_session_to_circuit_time(
    race: dict,
    date_key: str,
    time_key: str,
    target_tz_name: str,
) -> None:
    date_value = race.get(date_key)
    time_value = race.get(time_key)
    if not date_value or not time_value:
        return
    if "T" in str(date_value):
        return
    try:
        paris_session = datetime.fromisoformat(
            f"{date_value}T{_time_with_seconds(str(time_value))}"
        ).replace(tzinfo=ZoneInfo(LEGACY_CALENDAR_TIMEZONE))
    except ValueError:
        return
    circuit_session = paris_session.astimezone(ZoneInfo(target_tz_name))
    race[date_key] = circuit_session.date().isoformat()
    race[time_key] = circuit_session.strftime("%H:%M")


def race_with_circuit_timezone(race: dict) -> dict:
    """Normalize legacy Paris-time official races to local circuit time.

    The static 2026 calendar was originally stored in Paris viewing time. The
    app now models race state from circuit-local time, so official race entries
    are converted once in memory while preserving the same UTC instant. Test
    races and already-localized records are left untouched.
    """
    target_tz_name = CIRCUIT_TIMEZONES.get(race.get("circuit", ""))
    if not target_tz_name or race.get("is_test_race"):
        return dict(race)

    normalized = dict(race)
    if normalized.get("timezone") == target_tz_name:
        return normalized
    if normalized.get("timezone") not in {None, "", LEGACY_CALENDAR_TIMEZONE}:
        return normalized

    for date_key, time_key in SESSION_TIME_FIELDS:
        _convert_legacy_session_to_circuit_time(normalized, date_key, time_key, target_tz_name)

    normalized["timezone"] = target_tz_name
    normalized["legacy_time_basis"] = LEGACY_CALENDAR_TIMEZONE
    return normalized


def session_at_utc(
    race: dict,
    date_key: str,
    time_key: str,
    *,
    default_time: str | None = None,
) -> datetime | None:
    """Interpret a race session as local circuit time and return it as UTC."""
    date_value = race.get(date_key)
    if not date_value:
        return None

    raw_date = str(date_value)
    try:
        if "T" in raw_date:
            parsed = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=race_timezone(race))
            return parsed.astimezone(UTC)

        time_value = race.get(time_key) or default_time
        if not time_value:
            return None
        local_time = str(time_value)
        if len(local_time.split(":")) == 2:
            local_time = f"{local_time}:00"
        local_session = datetime.fromisoformat(f"{raw_date}T{local_time}").replace(
            tzinfo=race_timezone(race)
        )
        return local_session.astimezone(UTC)
    except ValueError:
        return None


def race_start_at_utc(race: dict) -> datetime | None:
    """Return race start as UTC from the circuit-local date/time."""
    return session_at_utc(race, "date", "race_time", default_time="15:00")


def race_duration_minutes(race: dict) -> int:
    """Return the configured race duration, clamped to a useful testable range."""
    try:
        minutes = int(race.get("race_duration_minutes") or DEFAULT_RACE_DURATION_MINUTES)
    except (TypeError, ValueError):
        minutes = DEFAULT_RACE_DURATION_MINUTES
    return max(1, min(minutes, 24 * 60))


def race_end_at_utc(race: dict) -> datetime | None:
    start_at = race_start_at_utc(race)
    if not start_at:
        return None
    return start_at + timedelta(minutes=race_duration_minutes(race))


def predictions_close_at_utc(race: dict) -> datetime | None:
    """Main prediction close time: 15 minutes before qualifying, in circuit time."""
    quali_at = session_at_utc(race, "quali_date", "quali_time", default_time="14:00")
    if not quali_at:
        quali_at = race_start_at_utc(race)
    if not quali_at:
        return None
    return quali_at - timedelta(minutes=15)


def sprint_predictions_close_at_utc(race: dict) -> datetime | None:
    if not (race.get("is_sprint") or race.get("is_sprint_weekend")):
        return None
    sprint_quali_at = session_at_utc(
        race,
        "sprint_quali_date",
        "sprint_quali_time",
        default_time="10:30",
    )
    if not sprint_quali_at:
        return None
    return sprint_quali_at - timedelta(minutes=15)


def has_complete_race_results(result_doc: dict | None) -> bool:
    if not result_doc:
        return False
    results = result_doc.get("results") or {}
    return bool(results.get("race_winner") and results.get("race_top10"))


def race_temporal_status(
    race: dict,
    *,
    now: datetime | None = None,
    has_results: bool = False,
) -> str:
    """Return upcoming, in_progress or finished using the local circuit schedule."""
    if race.get("is_cancelled"):
        return "cancelled"

    now_utc = (now or datetime.now(UTC)).astimezone(UTC)
    start_at = race_start_at_utc(race)
    end_at = race_end_at_utc(race)
    if not start_at or not end_at:
        if has_results:
            return "finished"
        return str(race.get("status") or "upcoming")
    if now_utc < start_at:
        return "upcoming"
    if now_utc < end_at:
        return "in_progress"
    return "finished"


def race_timing_payload(
    race: dict,
    *,
    now: datetime | None = None,
    has_results: bool = False,
) -> dict:
    """Computed timing fields shared by public API and back-office."""
    start_at = race_start_at_utc(race)
    end_at = race_end_at_utc(race)
    close_at = predictions_close_at_utc(race)
    sprint_close_at = sprint_predictions_close_at_utc(race)
    status = race_temporal_status(race, now=now, has_results=has_results)

    return {
        "race_start_at": start_at.isoformat() if start_at else None,
        "race_end_at": end_at.isoformat() if end_at else None,
        "race_duration_minutes": race_duration_minutes(race),
        "predictions_close_at": close_at.isoformat() if close_at else None,
        "sprint_predictions_close_at": sprint_close_at.isoformat() if sprint_close_at else None,
        "status": status,
        "is_past": status == "finished",
    }
