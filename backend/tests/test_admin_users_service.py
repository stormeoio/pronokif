from services import admin_users


def test_is_protected_admin_user_matches_supplied_admin_emails_case_insensitively():
    assert admin_users.is_protected_admin_user(
        {"email": " Fred@Stormeo.io "},
        ["fred@stormeo.io"],
    )
    assert not admin_users.is_protected_admin_user(
        {"email": "pilot@example.com"},
        ["fred@stormeo.io"],
    )


def test_users_search_query_matches_username_or_email():
    query = admin_users.users_search_query("pilot")

    assert query["$or"][0]["username"]["$regex"] == "pilot"
    assert query["$or"][1]["email"]["$options"] == "i"


def test_user_analytics_from_docs_groups_predictions_and_leagues():
    analytics = admin_users.user_analytics_from_docs(
        [
            {"id": "user-1", "email": "leader@example.com", "username": "leader"},
            {"id": "user-2", "email": "quiet@example.com", "username": "quiet", "is_banned": True},
        ],
        [
            {
                "id": "prediction-1",
                "user_id": "user-1",
                "is_complete": True,
                "score_preview": {"total": 42},
                "updated_at": "2026-05-29T10:00:00+00:00",
            }
        ],
        [{"id": "league-1", "created_by": "user-1", "members": ["user-1", "user-2"]}],
    )

    assert analytics["summary"]["users_count"] == 2
    assert analytics["summary"]["users_with_predictions"] == 1
    assert analytics["summary"]["banned_users"] == 1
    assert analytics["top_users"][0]["user_id"] == "user-1"
    assert analytics["top_users"][0]["total_points"] == 42
    assert analytics["inactive_users"][0]["user_id"] == "user-2"
