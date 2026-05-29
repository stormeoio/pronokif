from routes import admin_invitations


def test_dedupe_invitation_emails_normalizes_case_and_reports_duplicates():
    unique, skipped = admin_invitations._dedupe_invitation_emails(
        ["Pilot@Example.com", "pilot@example.com", "rookie@example.com"]
    )

    assert unique == ["pilot@example.com", "rookie@example.com"]
    assert skipped == [{"email": "pilot@example.com", "reason": "duplicate in batch"}]


def test_build_invitation_url_uses_frontend_url(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://beta.pronokif.eu/")

    assert admin_invitations._build_invitation_url("token-123") == "https://beta.pronokif.eu/auth?invite=token-123"


def test_build_invitation_doc_is_pending_and_translation_neutral(monkeypatch):
    monkeypatch.setattr(admin_invitations.secrets, "token_urlsafe", lambda size: f"token-{size}")
    monkeypatch.setattr(admin_invitations.uuid, "uuid4", lambda: "invitation-id")

    invitation, token = admin_invitations._build_invitation_doc(
        "pilot@example.com",
        "Bienvenue",
        "admin@pronokif.eu",
    )

    assert token == "token-32"
    assert invitation["id"] == "invitation-id"
    assert invitation["email"] == "pilot@example.com"
    assert invitation["message"] == "Bienvenue"
    assert invitation["sent_by"] == "admin@pronokif.eu"
    assert invitation["accepted"] is False
    assert "created_at" in invitation
    assert "expires_at" in invitation
