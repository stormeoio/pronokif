from datetime import UTC, datetime

from routes import admin_content
from services import admin_invitations


def test_invitation_status_handles_pending_expired_accepted_and_revoked():
    now = datetime(2026, 5, 29, 12, 0, tzinfo=UTC)

    assert (
        admin_invitations.invitation_status(
            {"expires_at": "2026-05-30T12:00:00+00:00"},
            now=now,
        )
        == "pending"
    )
    assert (
        admin_invitations.invitation_status(
            {"expires_at": "2026-05-28T12:00:00+00:00"},
            now=now,
        )
        == "expired"
    )
    assert admin_invitations.invitation_status({"accepted": True}, now=now) == "accepted"
    assert admin_invitations.invitation_status({"revoked": True, "accepted": True}, now=now) == "revoked"


def test_invitation_payload_never_exposes_token():
    payload = admin_invitations.invitation_payload(
        {
            "id": "inv-1",
            "email": "pilot@example.com",
            "token": "secret-token",
            "expires_at": "2026-05-30T12:00:00+00:00",
        },
        now=datetime(2026, 5, 29, 12, 0, tzinfo=UTC),
    )

    assert payload["status"] == "pending"
    assert payload["token"] is None


def test_invitation_analytics_from_docs_summarizes_funnel_by_sender():
    now = datetime(2026, 5, 29, 12, 0, tzinfo=UTC)
    analytics = admin_invitations.invitation_analytics_from_docs(
        [
            {
                "id": "inv-1",
                "sent_by": "admin@example.com",
                "accepted": True,
                "expires_at": "2026-05-30T12:00:00+00:00",
            },
            {
                "id": "inv-2",
                "sent_by": "admin@example.com",
                "accepted": False,
                "expires_at": "2026-05-28T12:00:00+00:00",
            },
            {
                "id": "inv-3",
                "sent_by": "ops@example.com",
                "revoked": True,
                "expires_at": "2026-05-30T12:00:00+00:00",
            },
        ],
        now=now,
    )

    assert analytics["summary"]["total"] == 3
    assert analytics["summary"]["accepted"] == 1
    assert analytics["summary"]["expired"] == 1
    assert analytics["summary"]["revoked"] == 1
    assert analytics["summary"]["acceptance_rate"] == 33.3
    assert analytics["by_sender"][0]["sent_by"] == "admin@example.com"


def test_business_ops_summary_weights_critical_items():
    items = [
        admin_content._business_action_item(
            item_id="scoring-1",
            severity="critical",
            area="scoring",
            title="Scoring incomplet",
            description="3 pronostics sans score",
            target_tab="scoring",
            metric=3,
        ),
        admin_content._business_action_item(
            item_id="content-1",
            severity="warning",
            area="courses",
            title="Contenu à préparer",
            description="Angle éditorial en brouillon",
            target_tab="races",
        ),
        admin_content._business_action_item(
            item_id="feedback-1",
            severity="info",
            area="support",
            title="Retours non lus",
            description="1 retour à lire",
            target_tab="feedbacks",
        ),
    ]

    summary = admin_content._business_ops_summary(items)

    assert summary["attention_count"] == 3
    assert summary["critical_count"] == 1
    assert summary["warning_count"] == 1
    assert summary["info_count"] == 1
    assert summary["business_score"] == 73


def test_race_ops_payload_computes_business_coverage():
    payload = admin_content._race_ops_payload(
        {
            "id": "australia-2026",
            "name": "Grand Prix d'Australie",
            "round_number": 1,
            "status": "finished",
            "content_status": "ready",
            "race_start_at": "2026-03-08T04:00:00+00:00",
            "predictions_close_at": "2026-03-07T04:45:00+00:00",
        },
        total_users=10,
        submitted=8,
        scored=6,
        has_results=True,
    )

    assert payload["completion_rate"] == 80
    assert payload["missing_predictions"] == 2
    assert payload["scoring_pending"] == 2
    assert payload["scoring_coverage_rate"] == 75
