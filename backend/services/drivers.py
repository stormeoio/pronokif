"""
PRONOKIF - Drivers detail service.

Wraps the static ``drivers_data`` catalogue with photo URLs, "useful
facts" generation, and side-by-side comparison metrics. The routes layer
stays a thin adapter over these helpers.
"""

from __future__ import annotations

import random

from config import db
from data.drivers_data import (
    F1_DRIVERS_DETAILED_2026,
    get_all_drivers_detailed,
    get_driver_details,
)

# Official F1 headshots (race suits). Fallback to Norris if unknown.
DRIVER_PHOTOS: dict[str, str] = {
    "norris": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png",
    "piastri": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/1col/image.png",
    "russell": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png.transform/1col/image.png",
    # antonelli: no real headshot on F1 CDN yet (2026 rookie — returns grey placeholder)
    "leclerc": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/1col/image.png",
    "hamilton": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/1col/image.png",
    "verstappen": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png",
    "hadjar": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/I/ISAHAD01_Isack_Hadjar/isahad01.png.transform/1col/image.png",
    "sainz": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/1col/image.png",
    "albon": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ALEALB01_Alexander_Albon/alealb01.png.transform/1col/image.png",
    "lawson": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/1col/image.png",
    # lindblad: no real headshot on F1 CDN yet (2026 rookie — returns grey placeholder)
    "alonso": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png.transform/1col/image.png",
    "stroll": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/1col/image.png",
    "ocon": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/1col/image.png",
    "bearman": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OLIBEA01_Oliver_Bearman/olibea01.png.transform/1col/image.png",
    "gasly": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/1col/image.png",
    "colapinto": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/1col/image.png",
    "hulkenberg": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/1col/image.png",
    "bortoleto": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GABBOR01_Gabriel_Bortoleto/gabbor01.png.transform/1col/image.png",
    "perez": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/S/SERPER01_Sergio_Perez/serper01.png.transform/1col/image.png",
    "bottas": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/V/VALBOT01_Valtteri_Bottas/valbot01.png.transform/1col/image.png",
}


def _photo_for(driver_id: str) -> str:
    return DRIVER_PHOTOS.get(driver_id, DRIVER_PHOTOS["norris"])


def _generate_driver_facts(driver: dict, next_race: dict | None = None) -> list[dict]:
    """Build up to 10 random "fun fact" cards for the driver detail page.

    Picks from a pool seeded by palmares, contract, demographics, and
    physical attributes — whatever is present in ``drivers_data``. Random
    so the user sees fresh angles on repeat visits.
    """
    f1_stats = driver.get("palmares", {}).get("f1", {})
    junior = driver.get("palmares", {}).get("junior", [])
    contract = driver.get("contract", {})

    all_facts: list[dict] = []

    if f1_stats.get("world_championships", 0) > 0:
        all_facts.append(
            {
                "type": "achievement",
                "title": "World Champion",
                "text": (
                    f"{driver['first_name']} has won {f1_stats['world_championships']} F1 world title(s)."
                ),
                "icon": "trophy",
            }
        )

    if f1_stats.get("wins", 0) > 0:
        all_facts.append(
            {
                "type": "stat",
                "title": "F1 wins",
                "text": f"Total of {f1_stats['wins']} Grand Prix win(s).",
                "icon": "flag",
            }
        )

    if f1_stats.get("podiums", 0) > 0:
        all_facts.append(
            {
                "type": "stat",
                "title": "Podiums",
                "text": f"{f1_stats['podiums']} total podium(s) in their F1 career.",
                "icon": "medal",
            }
        )

    if f1_stats.get("poles", 0) > 0:
        all_facts.append(
            {
                "type": "stat",
                "title": "Pole Positions",
                "text": f"{f1_stats['poles']} pole position(s) in qualifying.",
                "icon": "zap",
            }
        )

    if f1_stats.get("fastest_laps", 0) > 0:
        all_facts.append(
            {
                "type": "stat",
                "title": "Fastest Laps",
                "text": f"{f1_stats['fastest_laps']} fastest lap(s) in races.",
                "icon": "timer",
            }
        )

    for junior_season in junior[:3]:
        if junior_season.get("position") == 1:
            all_facts.append(
                {
                    "type": "junior",
                    "title": f"Champion {junior_season['series']}",
                    "text": (
                        f"Champion of {junior_season['series']} in {junior_season['year']}"
                        f" with {junior_season.get('team', 'N/A')}."
                    ),
                    "icon": "award",
                }
            )

    if contract.get("end_year"):
        years_left = contract["end_year"] - 2026
        if years_left > 0:
            all_facts.append(
                {
                    "type": "contract",
                    "title": "Current contract",
                    "text": (
                        f"Under contract with {driver['team']} until {contract['end_year']}"
                        f" ({years_left} year(s) remaining)."
                    ),
                    "icon": "file",
                }
            )

    if contract.get("salary_estimate"):
        all_facts.append(
            {
                "type": "contract",
                "title": "Estimated salary",
                "text": f"Estimated compensation: {contract['salary_estimate']}.",
                "icon": "dollar",
            }
        )

    age = 2026 - int(driver.get("date_of_birth", "2000-01-01").split("-")[0])
    all_facts.append(
        {
            "type": "personal",
            "title": "Age",
            "text": f"{driver['first_name']} is {age} years old (born on {driver.get('date_of_birth', 'N/A')}).",
            "icon": "calendar",
        }
    )

    all_facts.append(
        {
            "type": "personal",
            "title": "Nationality",
            "text": f"Represents {driver.get('country_name', driver.get('country', 'N/A'))} in Formula 1.",
            "icon": "flag",
        }
    )

    all_facts.append(
        {
            "type": "personal",
            "title": "Place of birth",
            "text": f"Born in {driver.get('place_of_birth', 'N/A')}.",
            "icon": "map",
        }
    )

    if driver.get("height_cm"):
        all_facts.append(
            {
                "type": "physical",
                "title": "Height",
                "text": f"Measures {driver['height_cm']} cm.",
                "icon": "ruler",
            }
        )

    all_facts.append(
        {
            "type": "team",
            "title": "Current team",
            "text": f"Drives for {driver['team']} with number {driver.get('number', 'N/A')}.",
            "icon": "car",
        }
    )

    if f1_stats.get("first_team"):
        all_facts.append(
            {
                "type": "career",
                "title": "F1 debut",
                "text": f"Debuted in F1 with {f1_stats['first_team']} ({f1_stats.get('seasons', 'N/A')}).",
                "icon": "play",
            }
        )

    if f1_stats.get("entries", 0) > 0:
        all_facts.append(
            {
                "type": "experience",
                "title": "Experience",
                "text": f"{f1_stats['entries']} Grand Prix starts in their career.",
                "icon": "target",
            }
        )

    if f1_stats.get("points", 0) > 0:
        all_facts.append(
            {
                "type": "stat",
                "title": "Career points",
                "text": f"Total of {f1_stats['points']} points scored in F1.",
                "icon": "hash",
            }
        )

    if driver.get("license_points"):
        all_facts.append(
            {
                "type": "misc",
                "title": "License points",
                "text": f"Currently {driver['license_points']}/12 points on their super licence.",
                "icon": "shield",
            }
        )

    if contract.get("notes"):
        all_facts.append(
            {
                "type": "info",
                "title": "Contract info",
                "text": contract["notes"],
                "icon": "info",
            }
        )

    random.shuffle(all_facts)
    return all_facts[:10]


async def get_details(driver_id: str) -> dict | None:
    """Look up a driver by slug, falling back to the 3-letter code (VER,
    HAM…). Enriches the result with a photo URL and 10 useful facts
    contextualised on the next upcoming race. Returns None if unknown.
    """
    driver = get_driver_details(driver_id)

    if not driver:
        for d in F1_DRIVERS_DETAILED_2026.values():
            if d.get("code", "").lower() == driver_id.lower():
                driver = d
                break

    if not driver:
        return None

    # Check admin DB for custom photos (dark/light variants uploaded via BO)
    admin_doc = await db.drivers.find_one({"_id": driver["id"]})
    if admin_doc and (admin_doc.get("photo_url_dark") or admin_doc.get("photo_url_light")):
        driver["photo_url"] = admin_doc.get("photo_url_dark") or admin_doc.get("photo_url_light")
        driver["photo_url_dark"] = admin_doc.get("photo_url_dark")
        driver["photo_url_light"] = admin_doc.get("photo_url_light")
    elif admin_doc and admin_doc.get("photo_url"):
        driver["photo_url"] = admin_doc["photo_url"]
    else:
        driver["photo_url"] = _photo_for(driver["id"])

    next_race = await db.races.find_one(
        {"status": {"$in": ["upcoming", "active"]}},
        {"_id": 0},
        sort=[("date", 1)],
    )

    driver["useful_facts"] = _generate_driver_facts(driver, next_race)
    return driver


async def get_all() -> list[dict]:
    """Return the full grid with photo URLs attached.

    Checks the admin DB for custom photos first, falling back to the
    hardcoded F1 CDN headshots.
    """
    drivers = get_all_drivers_detailed()

    # Bulk-fetch admin overrides in one query
    admin_docs = {
        doc["_id"]: doc
        async for doc in db.drivers.find(
            {},
            {"_id": 1, "photo_url": 1, "photo_url_dark": 1, "photo_url_light": 1},
        )
    }

    for driver in drivers:
        admin = admin_docs.get(driver["id"])
        if admin and (admin.get("photo_url_dark") or admin.get("photo_url_light")):
            driver["photo_url"] = admin.get("photo_url_dark") or admin.get("photo_url_light")
            driver["photo_url_dark"] = admin.get("photo_url_dark")
            driver["photo_url_light"] = admin.get("photo_url_light")
        elif admin and admin.get("photo_url"):
            driver["photo_url"] = admin["photo_url"]
        else:
            driver["photo_url"] = _photo_for(driver["id"])
    return drivers


def _winner(a: int, b: int) -> str:
    if a > b:
        return "driver1"
    if b > a:
        return "driver2"
    return "tie"


def compare(driver1_id: str, driver2_id: str) -> dict | None:
    """Build a side-by-side comparison of two drivers (F1 palmares +
    derived rates). Returns None if either driver is unknown so the route
    can raise 404.
    """
    d1 = get_driver_details(driver1_id)
    d2 = get_driver_details(driver2_id)

    if not d1 or not d2:
        return None

    d1["photo_url"] = _photo_for(d1["id"])
    d2["photo_url"] = _photo_for(d2["id"])

    d1_f1 = d1.get("palmares", {}).get("f1", {})
    d2_f1 = d2.get("palmares", {}).get("f1", {})

    metrics = (
        "world_championships",
        "wins",
        "podiums",
        "poles",
        "fastest_laps",
        "points",
        "entries",
    )
    stats_comparison = {
        m: {
            "driver1": d1_f1.get(m, 0),
            "driver2": d2_f1.get(m, 0),
            "winner": _winner(d1_f1.get(m, 0), d2_f1.get(m, 0)),
        }
        for m in metrics
    }

    def _rate(stat: str, d_f1: dict) -> float:
        return round((d_f1.get(stat, 0) / max(d_f1.get("entries", 1), 1)) * 100, 1)

    return {
        "driver1": d1,
        "driver2": d2,
        "stats_comparison": stats_comparison,
        "win_rate": {"driver1": _rate("wins", d1_f1), "driver2": _rate("wins", d2_f1)},
        "podium_rate": {
            "driver1": _rate("podiums", d1_f1),
            "driver2": _rate("podiums", d2_f1),
        },
        "pole_rate": {
            "driver1": _rate("poles", d1_f1),
            "driver2": _rate("poles", d2_f1),
        },
        "points_per_race": {
            "driver1": round(d1_f1.get("points", 0) / max(d1_f1.get("entries", 1), 1), 2),
            "driver2": round(d2_f1.get("points", 0) / max(d2_f1.get("entries", 1), 1), 2),
        },
    }
