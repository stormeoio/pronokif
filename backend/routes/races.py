"""
PRONOKIF - Race & Driver Routes
/races/*, /drivers/* endpoints for F1 data
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone, timedelta

from config import db
from models.schemas import RaceResponse, DriverResponse
from services.auth import get_current_user
from data.f1_data import F1_DRIVERS_2026, F1_RACES_2026, F1_CIRCUITS

router = APIRouter(tags=["Races & Drivers"])


# ==================== HELPER FUNCTIONS ====================

def get_predictions_close_time(race: dict) -> datetime:
    """Get the time when main race predictions close (15 min before Q1)"""
    quali_date = race["quali_date"]
    quali_time = race.get("quali_time", "14:00")
    quali_datetime = datetime.fromisoformat(f"{quali_date}T{quali_time}:00+00:00")
    return quali_datetime - timedelta(minutes=15)


def get_sprint_predictions_close_time(race: dict):
    """Get the time when sprint predictions close (15 min before SQ1)"""
    if not race.get("is_sprint"):
        return None
    sprint_quali_date = race.get("sprint_quali_date")
    sprint_quali_time = race.get("sprint_quali_time", "10:30")
    if sprint_quali_date:
        sq_datetime = datetime.fromisoformat(f"{sprint_quali_date}T{sprint_quali_time}:00+00:00")
        return sq_datetime - timedelta(minutes=15)
    return None


# ==================== DRIVER ENDPOINTS ====================

@router.get("/drivers", response_model=List[DriverResponse])
async def get_drivers():
    """Get all F1 drivers for 2026 season"""
    return [DriverResponse(**d) for d in F1_DRIVERS_2026]


@router.get("/drivers/{driver_id}")
async def get_driver(driver_id: str):
    """Get a specific driver's info"""
    driver = next((d for d in F1_DRIVERS_2026 if d["id"] == driver_id), None)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


# ==================== RACE ENDPOINTS ====================

@router.get("/races", response_model=List[RaceResponse])
async def get_races():
    """Get all races for 2026 season"""
    now = datetime.now(timezone.utc)
    races = []
    
    for race in F1_RACES_2026:
        race_time = race.get("race_time", "15:00")
        quali_time = race.get("quali_time", "14:00")
        
        race_date = datetime.fromisoformat(race["date"] + "T" + race_time + ":00+00:00")
        quali_date = datetime.fromisoformat(race["quali_date"] + "T" + quali_time + ":00+00:00")
        predictions_close = quali_date - timedelta(hours=1)
        
        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        has_results = result_doc and result_doc.get("results") and result_doc.get("results", {}).get("race_winner")
        
        if has_results:
            status = "finished"
        elif now < predictions_close:
            status = "upcoming"
        elif now < race_date:
            status = "in_progress"
        else:
            status = "finished"
        
        race_response = {
            "id": race["id"], "name": race["name"], "circuit": race["circuit"],
            "country": race["country"], "date": race_date.isoformat(),
            "quali_date": quali_date.isoformat(),
            "predictions_close_at": predictions_close.isoformat(),
            "status": status, "is_sprint_weekend": race.get("is_sprint", False),
            "results": result_doc.get("results") if result_doc else None,
            "race_time": race_time,
            "quali_time": quali_time,
            "timezone": race.get("timezone", "Europe/Paris")
        }
        
        if race.get("is_sprint"):
            sprint_quali_time = race.get("sprint_quali_time", "10:00")
            sprint_race_time = race.get("sprint_race_time", "14:00")
            race_response["sprint_quali_date"] = race.get("sprint_quali_date", "") + "T" + sprint_quali_time + ":00+00:00"
            race_response["sprint_race_date"] = race.get("sprint_race_date", "") + "T" + sprint_race_time + ":00+00:00"
            race_response["sprint_quali_time"] = sprint_quali_time
            race_response["sprint_race_time"] = sprint_race_time
        
        races.append(RaceResponse(**race_response))
    
    return races


@router.get("/races/next", response_model=RaceResponse)
async def get_next_race():
    """Get the next upcoming race"""
    now = datetime.now(timezone.utc)
    
    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        if now < race_date:
            quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
            predictions_close = get_predictions_close_time(race)
            status = "upcoming" if now < predictions_close else "in_progress"
            
            fp1_datetime = datetime.fromisoformat(f"{race['fp1_date']}T{race['fp1_time']}:00+00:00")
            
            response = {
                "id": race["id"], "name": race["name"], "circuit": race["circuit"],
                "country": race["country"], "date": race_date.isoformat(),
                "quali_date": quali_date.isoformat(),
                "fp1_date": fp1_datetime.isoformat(),
                "predictions_close_at": predictions_close.isoformat(),
                "status": status, "is_sprint_weekend": race.get("is_sprint", False),
                "results": None
            }
            if race.get("is_sprint"):
                response["sprint_quali_date"] = race.get("sprint_quali_date", "") + "T10:00:00+00:00"
                response["sprint_race_date"] = race.get("sprint_race_date", "") + "T14:00:00+00:00"
            return RaceResponse(**response)
    
    # Return last race if all finished
    race = F1_RACES_2026[-1]
    return RaceResponse(
        id=race["id"], name=race["name"], circuit=race["circuit"],
        country=race["country"], date=race["date"] + "T15:00:00+00:00",
        quali_date=race["quali_date"] + "T14:00:00+00:00",
        predictions_close_at=get_predictions_close_time(race).isoformat(),
        status="finished", is_sprint_weekend=race.get("is_sprint", False), results=None
    )


@router.get("/races/upcoming")
async def get_upcoming_races():
    """Get all upcoming races for the season (for predictions calendar)"""
    now = datetime.now(timezone.utc)
    upcoming = []
    
    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T" + race.get("race_time", "15:00") + ":00+00:00")
        quali_date = datetime.fromisoformat(race["quali_date"] + "T" + race.get("quali_time", "14:00") + ":00+00:00")
        predictions_close = get_predictions_close_time(race)
        sprint_predictions_close = get_sprint_predictions_close_time(race)
        
        if now < predictions_close:
            status = "upcoming"
        elif now < race_date:
            status = "in_progress"
        else:
            status = "finished"
        
        can_predict = now < predictions_close
        can_predict_sprint = sprint_predictions_close and now < sprint_predictions_close
        
        race_data = {
            "id": race["id"],
            "name": race["name"],
            "circuit": race["circuit"],
            "country": race["country"],
            "date": race_date.isoformat(),
            "quali_date": quali_date.isoformat(),
            "predictions_close_at": predictions_close.isoformat(),
            "sprint_predictions_close_at": sprint_predictions_close.isoformat() if sprint_predictions_close else None,
            "status": status,
            "can_predict": can_predict,
            "can_predict_sprint": can_predict_sprint,
            "is_sprint_weekend": race.get("is_sprint", False)
        }
        
        upcoming.append(race_data)
    
    return upcoming


@router.get("/races/{race_id}")
async def get_race(race_id: str):
    """Get detailed info for a specific race"""
    for race in F1_RACES_2026:
        if race["id"] == race_id:
            now = datetime.now(timezone.utc)
            race_date = datetime.fromisoformat(race["date"] + "T" + race.get("race_time", "15:00") + ":00+00:00")
            quali_date = datetime.fromisoformat(race["quali_date"] + "T" + race.get("quali_time", "14:00") + ":00+00:00")
            predictions_close = get_predictions_close_time(race)
            sprint_predictions_close = get_sprint_predictions_close_time(race)
            
            if now < predictions_close:
                status = "upcoming"
            elif now < race_date:
                status = "in_progress"
            else:
                status = "finished"
            
            can_predict = now < predictions_close
            can_predict_sprint = sprint_predictions_close and now < sprint_predictions_close
            
            result_doc = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
            
            return {
                "id": race["id"], "name": race["name"], "circuit": race["circuit"],
                "country": race["country"], "date": race_date.isoformat(),
                "quali_date": quali_date.isoformat(),
                "sprint_quali_date": (race.get("sprint_quali_date", "") + "T" + race.get("sprint_quali_time", "10:30") + ":00+00:00") if race.get("is_sprint") else None,
                "sprint_race_date": (race.get("sprint_race_date", "") + "T" + race.get("sprint_race_time", "14:00") + ":00+00:00") if race.get("is_sprint") else None,
                "predictions_close_at": predictions_close.isoformat(),
                "sprint_predictions_close_at": sprint_predictions_close.isoformat() if sprint_predictions_close else None,
                "can_predict": can_predict,
                "can_predict_sprint": can_predict_sprint,
                "status": status, "is_sprint_weekend": race.get("is_sprint", False),
                "results": result_doc.get("results") if result_doc else None
            }
    raise HTTPException(status_code=404, detail="Race not found")


@router.get("/races/{race_id}/details")
async def get_race_details(race_id: str):
    """Get detailed information for a specific race including circuit info and session times"""
    for race in F1_RACES_2026:
        if race["id"] == race_id:
            now = datetime.now(timezone.utc)
            race_date = datetime.fromisoformat(race["date"] + "T" + race.get("race_time", "15:00") + ":00+00:00")
            predictions_close = get_predictions_close_time(race)
            
            if now < predictions_close:
                status = "upcoming"
            elif now < race_date:
                status = "in_progress"
            else:
                status = "finished"
            
            # Get circuit details
            circuit_info = F1_CIRCUITS.get(race["circuit"], {})
            
            result = {
                "id": race["id"],
                "name": race["name"],
                "circuit": race["circuit"],
                "circuit_full_name": circuit_info.get("full_name", race["circuit"]),
                "circuit_length_km": circuit_info.get("length_km"),
                "circuit_turns": circuit_info.get("turns"),
                "circuit_laps": circuit_info.get("laps"),
                "country": race["country"],
                "status": status,
                "is_sprint_weekend": race.get("is_sprint", False),
                "timezone": race.get("timezone", "Europe/Paris"),
                "sessions": {
                    "fp1": {"date": race.get("fp1_date"), "time": race.get("fp1_time")},
                    "fp2": {"date": race.get("fp2_date"), "time": race.get("fp2_time")},
                    "fp3": {"date": race.get("fp3_date"), "time": race.get("fp3_time")} if not race.get("is_sprint") else None,
                    "qualifying": {"date": race.get("quali_date"), "time": race.get("quali_time")},
                    "race": {"date": race.get("date"), "time": race.get("race_time")},
                }
            }
            
            if race.get("is_sprint"):
                result["sessions"]["sprint_qualifying"] = {
                    "date": race.get("sprint_quali_date"),
                    "time": race.get("sprint_quali_time")
                }
                result["sessions"]["sprint_race"] = {
                    "date": race.get("sprint_race_date"),
                    "time": race.get("sprint_race_time")
                }
            
            return result
    
    raise HTTPException(status_code=404, detail="Race not found")
