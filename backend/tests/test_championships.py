from services.championships import (
    F1_2026_CHAMPIONSHIP_ID,
    F1_2026_SEASON,
    f1_2026_championship_from_races,
    with_championship_link,
)


def test_f1_2026_championship_uses_stable_ids_and_translations():
    championship = f1_2026_championship_from_races(
        [
            {"id": "australia-2026", "is_cancelled": False},
            {"id": "bahrain-2026", "is_cancelled": True},
        ]
    )

    assert championship["id"] == F1_2026_CHAMPIONSHIP_ID
    assert championship["season"] == F1_2026_SEASON
    assert championship["race_ids"] == ["australia-2026", "bahrain-2026"]
    assert championship["active_race_ids"] == ["australia-2026"]
    assert championship["cancelled_race_ids"] == ["bahrain-2026"]
    assert championship["name_translations"]["fr"]
    assert championship["name_translations"]["en"]


def test_static_2026_race_gets_default_championship_link():
    linked = with_championship_link({"id": "monaco-2026", "name": "Monaco Grand Prix"})

    assert linked["championship_id"] == F1_2026_CHAMPIONSHIP_ID
    assert linked["season"] == F1_2026_SEASON
