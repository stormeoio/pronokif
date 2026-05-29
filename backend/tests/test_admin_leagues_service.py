from services import admin_leagues


def test_league_search_query_matches_name_code_or_description():
    query = admin_leagues.league_search_query("paddock")

    assert query["$or"][0]["name"]["$regex"] == "paddock"
    assert query["$or"][1]["code"]["$options"] == "i"
    assert query["$or"][2]["description"]["$regex"] == "paddock"


def test_dedupe_user_ids_strips_blank_and_duplicate_values():
    assert admin_leagues.dedupe_user_ids([" user-1 ", "", "user-2", "user-1", None]) == [
        "user-1",
        "user-2",
    ]


def test_league_admin_payload_enriches_owner_members_and_points():
    payload = admin_leagues.league_admin_payload(
        {
            "id": "league-1",
            "name": "Paddock Paris",
            "code": "PK2026",
            "created_by": "user-1",
            "members": ["user-1", "user-2", "user-2"],
        },
        users_by_id={
            "user-1": {"id": "user-1", "email": "owner@example.com", "username": "Owner"},
            "user-2": {"id": "user-2", "email": "rookie@example.com", "username": "Rookie"},
        },
        leaderboard_entries=[
            {"league_id": "league-1", "user_id": "user-1", "total_points": 42, "last_race_points": 8},
            {"league_id": "league-1", "user_id": "user-2", "total_points": 55, "last_race_points": 12},
        ],
        messages_count=7,
    )

    assert payload["members"] == ["user-1", "user-2"]
    assert payload["members_count"] == 2
    assert payload["owner_email"] == "owner@example.com"
    assert payload["messages_count"] == 7
    assert payload["total_points"] == 97
    assert payload["top_members"][0]["user_id"] == "user-2"
    assert payload["member_details"][1]["is_owner"] is True


def test_league_analytics_from_payloads_summarizes_community_health():
    analytics = admin_leagues.league_analytics_from_payloads(
        [
            {
                "id": "league-1",
                "name": "Paddock Paris",
                "members_count": 4,
                "messages_count": 9,
                "total_points": 100,
                "review_status": "validated",
            },
            {
                "id": "league-2",
                "name": "Empty Grid",
                "members_count": 0,
                "messages_count": 0,
                "total_points": 0,
                "is_archived": True,
            },
        ]
    )

    assert analytics["summary"]["leagues_count"] == 2
    assert analytics["summary"]["active_leagues"] == 1
    assert analytics["summary"]["empty_leagues"] == 1
    assert analytics["summary"]["average_members"] == 2
    assert analytics["summary"]["total_messages"] == 9
    assert analytics["top_by_members"][0]["id"] == "league-1"
    assert analytics["review_queue"]["validated"] == 1
    assert analytics["review_queue"]["none"] == 1
