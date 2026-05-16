"""
Test Separate Sprint/Main Prediction Endpoints for PRONOKIF application.

NEW ENDPOINTS TO TEST (Never tested before):
- POST /api/predictions/sprint - Save sprint predictions only
- POST /api/predictions/main - Save main race predictions only

These endpoints allow users to submit sprint and main race predictions separately
with different deadlines:
- Sprint: closes 15 min before SQ1 (Sprint Qualifying)
- Main: closes 15 min before Q1 (Main Qualifying)

Also tests:
- GET /api/admin/members - List all registered members (admin only)
- GET /api/admin/members/{member_id} - Get member details (admin only)
"""

import os
import random
import string

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Admin email for testing admin endpoints
ADMIN_EMAIL = "catalan.baptiste123@gmail.com"
TEST_PASSWORD = "test12345"

# Test driver IDs for predictions
DRIVER_IDS = [
    "norris",
    "piastri",
    "russell",
    "antonelli",
    "leclerc",
    "hamilton",
    "verstappen",
    "hadjar",
    "sainz",
    "albon",
    "lawson",
    "lindblad",
    "alonso",
    "stroll",
    "ocon",
    "bearman",
    "gasly",
    "colapinto",
    "hulkenberg",
    "bortoleto",
]

# Sprint race to test: miami-2026 (upcoming sprint weekend)
# Classic race to test: japan-2026 (non-sprint weekend)
SPRINT_RACE_ID = "miami-2026"
CLASSIC_RACE_ID = "japan-2026"


@pytest.fixture(scope="module")
def api_session():
    """Create requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def random_email():
    """Generate random test email"""
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_sprint_main_{suffix}@test.com"


@pytest.fixture(scope="module")
def test_user(api_session):
    """Register a new test user and get auth token"""
    email = random_email()

    response = api_session.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": TEST_PASSWORD})

    if response.status_code == 200:
        data = response.json()
        print(f"Registered new test user: {email}")
        return {"token": data.get("access_token"), "user_id": data.get("user", {}).get("id"), "email": email}

    pytest.skip(f"Could not create test user: {response.text}")


@pytest.fixture
def user_headers(test_user):
    """Get authorization headers for regular user"""
    return {"Authorization": f"Bearer {test_user['token']}"}


@pytest.fixture(scope="module")
def admin_user(api_session):
    """Login or register admin user"""
    # Try to login first
    login_response = api_session.post(
        f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD}
    )

    if login_response.status_code == 200:
        data = login_response.json()
        print(f"Logged in as admin: {ADMIN_EMAIL}")
        return {"token": data.get("access_token"), "user_id": data.get("user", {}).get("id"), "email": ADMIN_EMAIL}

    # If login fails, try to register
    register_response = api_session.post(
        f"{BASE_URL}/api/auth/register", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD}
    )

    if register_response.status_code == 200:
        data = register_response.json()
        print(f"Registered admin user: {ADMIN_EMAIL}")
        return {"token": data.get("access_token"), "user_id": data.get("user", {}).get("id"), "email": ADMIN_EMAIL}

    pytest.skip(f"Could not login or register admin user: {login_response.text} / {register_response.text}")


@pytest.fixture
def admin_headers(admin_user):
    """Get authorization headers for admin user"""
    return {"Authorization": f"Bearer {admin_user['token']}"}


# ==================== SPRINT ENDPOINT TESTS ====================


class TestSprintPredictionsEndpoint:
    """Tests for POST /api/predictions/sprint endpoint (NEW - NEVER TESTED)"""

    def test_sprint_endpoint_accepts_valid_sprint_prediction(self, api_session, user_headers):
        """Sprint endpoint should accept valid sprint predictions for sprint weekend"""
        payload = {
            "race_id": SPRINT_RACE_ID,
            "sprint_quali_pole": "verstappen",
            "sprint_quali_top10": DRIVER_IDS[:10],
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
            "sprint_bonus_bets": {
                "safety_car": False,
                "dnf_drivers": [],
                "fastest_lap_driver": "leclerc",
                "first_corner_leader": "verstappen",
            },
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/sprint", json=payload, headers=user_headers)

        if response.status_code == 200:
            data = response.json()
            assert data.get("sprint_quali_pole") == "verstappen", "Sprint quali pole should be stored"
            assert len(data.get("sprint_quali_top10", [])) == 10, "Sprint quali top10 should have 10 drivers"
            assert data.get("sprint_race_winner") == "norris", "Sprint race winner should be stored"
            assert len(data.get("sprint_race_top10", [])) == 10, "Sprint race top10 should have 10 drivers"
            assert "sprint_updated_at" in data, "Should have sprint_updated_at timestamp"
            print("PASS: Sprint endpoint accepted valid prediction")
        elif response.status_code == 400:
            detail = response.json().get("detail", "")
            if "fermés" in detail.lower() or "closed" in detail.lower():
                pytest.skip("Sprint predictions are closed for this race")
            else:
                pytest.fail(f"Unexpected 400 error: {detail}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")

    def test_sprint_endpoint_rejects_non_sprint_weekend(self, api_session, user_headers):
        """Sprint endpoint should reject predictions for non-sprint weekends"""
        payload = {
            "race_id": CLASSIC_RACE_ID,  # japan-2026 is NOT a sprint weekend
            "sprint_quali_pole": "verstappen",
            "sprint_quali_top10": DRIVER_IDS[:10],
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/sprint", json=payload, headers=user_headers)

        assert response.status_code == 400, f"Expected 400 for non-sprint weekend, got {response.status_code}"
        detail = response.json().get("detail", "")
        assert "sprint" in detail.lower(), f"Error should mention sprint: {detail}"
        print(f"PASS: Sprint endpoint correctly rejects non-sprint weekend: {detail}")

    def test_sprint_endpoint_validates_top10_count(self, api_session, user_headers):
        """Sprint endpoint should reject invalid top10 count"""
        payload = {
            "race_id": SPRINT_RACE_ID,
            "sprint_quali_pole": "verstappen",
            "sprint_quali_top10": DRIVER_IDS[:5],  # Only 5 drivers instead of 10
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/sprint", json=payload, headers=user_headers)

        # Should fail validation (unless predictions are closed)
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "fermés" not in detail.lower():
                assert "10" in detail or "top" in detail.lower(), f"Error should mention top 10: {detail}"
                print(f"PASS: Sprint endpoint validates sprint_quali_top10 count: {detail}")
            else:
                pytest.skip("Sprint predictions are closed")
        elif response.status_code == 422:
            # Pydantic validation error
            print("PASS: Sprint endpoint validates sprint_quali_top10 at model level")
        else:
            pytest.fail(f"Expected validation error, got {response.status_code}: {response.text}")

    def test_sprint_endpoint_rejects_invalid_race_id(self, api_session, user_headers):
        """Sprint endpoint should reject invalid race ID"""
        payload = {
            "race_id": "invalid-race-2026",
            "sprint_quali_pole": "verstappen",
            "sprint_quali_top10": DRIVER_IDS[:10],
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/sprint", json=payload, headers=user_headers)

        assert response.status_code == 404, f"Expected 404 for invalid race, got {response.status_code}"
        print("PASS: Sprint endpoint correctly rejects invalid race ID")

    def test_sprint_endpoint_requires_authentication(self, api_session):
        """Sprint endpoint should require authentication"""
        payload = {
            "race_id": SPRINT_RACE_ID,
            "sprint_quali_pole": "verstappen",
            "sprint_quali_top10": DRIVER_IDS[:10],
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/sprint", json=payload)

        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Sprint endpoint requires authentication")


# ==================== MAIN PREDICTION ENDPOINT TESTS ====================


class TestMainPredictionsEndpoint:
    """Tests for POST /api/predictions/main endpoint (NEW - NEVER TESTED)"""

    def test_main_endpoint_accepts_valid_main_prediction(self, api_session, user_headers):
        """Main endpoint should accept valid main race predictions"""
        payload = {
            "race_id": SPRINT_RACE_ID,  # Can submit main prediction for sprint weekend too
            "quali_pole": "leclerc",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "hamilton",
            "race_top10": DRIVER_IDS[:10],
            "bonus_bets": {
                "safety_car": True,
                "dnf_drivers": ["alonso"],
                "fastest_lap_driver": "verstappen",
                "first_corner_leader": "leclerc",
            },
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/main", json=payload, headers=user_headers)

        if response.status_code == 200:
            data = response.json()
            assert data.get("quali_pole") == "leclerc", "Quali pole should be stored"
            assert len(data.get("quali_top10", [])) == 10, "Quali top10 should have 10 drivers"
            assert data.get("race_winner") == "hamilton", "Race winner should be stored"
            assert len(data.get("race_top10", [])) == 10, "Race top10 should have 10 drivers"
            assert "main_updated_at" in data, "Should have main_updated_at timestamp"
            print("PASS: Main endpoint accepted valid prediction for sprint weekend")
        elif response.status_code == 400:
            detail = response.json().get("detail", "")
            if "fermés" in detail.lower() or "closed" in detail.lower():
                pytest.skip("Main predictions are closed for this race")
            else:
                pytest.fail(f"Unexpected 400 error: {detail}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")

    def test_main_endpoint_works_for_classic_weekend(self, api_session, user_headers):
        """Main endpoint should work for classic weekends"""
        payload = {
            "race_id": CLASSIC_RACE_ID,
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "norris",
            "race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/main", json=payload, headers=user_headers)

        if response.status_code == 200:
            data = response.json()
            assert data.get("quali_pole") == "verstappen"
            assert data.get("race_winner") == "norris"
            print("PASS: Main endpoint works for classic weekend")
        elif response.status_code == 400:
            detail = response.json().get("detail", "")
            if "fermés" in detail.lower():
                pytest.skip("Main predictions are closed for classic race")
            pytest.fail(f"Unexpected error: {detail}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")

    def test_main_endpoint_validates_top10_count(self, api_session, user_headers):
        """Main endpoint should reject invalid top10 count"""
        payload = {
            "race_id": SPRINT_RACE_ID,
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:3],  # Only 3 drivers
            "race_winner": "norris",
            "race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/main", json=payload, headers=user_headers)

        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "fermés" not in detail.lower():
                assert "10" in detail or "top" in detail.lower(), f"Error should mention top 10: {detail}"
                print(f"PASS: Main endpoint validates quali_top10 count: {detail}")
            else:
                pytest.skip("Main predictions are closed")
        elif response.status_code == 422:
            print("PASS: Main endpoint validates quali_top10 at model level")
        else:
            pytest.fail(f"Expected validation error, got {response.status_code}")

    def test_main_endpoint_rejects_invalid_race_id(self, api_session, user_headers):
        """Main endpoint should reject invalid race ID"""
        payload = {
            "race_id": "nonexistent-race-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "norris",
            "race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/main", json=payload, headers=user_headers)

        assert response.status_code == 404, f"Expected 404 for invalid race, got {response.status_code}"
        print("PASS: Main endpoint correctly rejects invalid race ID")

    def test_main_endpoint_requires_authentication(self, api_session):
        """Main endpoint should require authentication"""
        payload = {
            "race_id": SPRINT_RACE_ID,
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "norris",
            "race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions/main", json=payload)

        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Main endpoint requires authentication")


# ==================== INTEGRATION TESTS ====================


class TestSprintMainIntegration:
    """Tests for integration between sprint and main endpoints"""

    def test_sprint_and_main_update_same_document(self, api_session, user_headers):
        """Sprint and main endpoints should update the same prediction document"""
        # First submit sprint prediction
        sprint_payload = {
            "race_id": SPRINT_RACE_ID,
            "sprint_quali_pole": "verstappen",
            "sprint_quali_top10": DRIVER_IDS[:10],
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
        }

        sprint_response = api_session.post(
            f"{BASE_URL}/api/predictions/sprint", json=sprint_payload, headers=user_headers
        )

        if sprint_response.status_code == 400:
            detail = sprint_response.json().get("detail", "")
            if "fermés" in detail.lower():
                pytest.skip("Sprint predictions are closed")
            pytest.fail(f"Sprint submission failed: {detail}")

        # Then submit main prediction
        main_payload = {
            "race_id": SPRINT_RACE_ID,
            "quali_pole": "leclerc",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "hamilton",
            "race_top10": DRIVER_IDS[:10],
        }

        main_response = api_session.post(f"{BASE_URL}/api/predictions/main", json=main_payload, headers=user_headers)

        if main_response.status_code == 400:
            detail = main_response.json().get("detail", "")
            if "fermés" in detail.lower():
                pytest.skip("Main predictions are closed")
            pytest.fail(f"Main submission failed: {detail}")

        # Now get the prediction and verify both sets of data are present
        get_response = api_session.get(f"{BASE_URL}/api/predictions/race/{SPRINT_RACE_ID}", headers=user_headers)

        if get_response.status_code == 200 and get_response.json():
            data = get_response.json()

            # Verify sprint data
            assert data.get("sprint_quali_pole") == "verstappen", "Sprint quali pole should be preserved"
            assert data.get("sprint_race_winner") == "norris", "Sprint race winner should be preserved"

            # Verify main data
            assert data.get("quali_pole") == "leclerc", "Main quali pole should be stored"
            assert data.get("race_winner") == "hamilton", "Main race winner should be stored"

            print("PASS: Sprint and main endpoints update the same prediction document")
        else:
            pytest.skip("Could not verify - prediction may not exist")


# ==================== ADMIN MEMBERS ENDPOINT TESTS ====================


class TestAdminMembersEndpoint:
    """Tests for GET /api/admin/members endpoint"""

    def test_admin_members_returns_list(self, api_session, admin_headers):
        """Admin members endpoint should return list of all users"""
        response = api_session.get(f"{BASE_URL}/api/admin/members", headers=admin_headers)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        assert isinstance(data, list), "Response should be a list"

        if len(data) > 0:
            member = data[0]
            # Verify expected fields
            assert "id" in member, "Member should have id"
            assert "email" in member, "Member should have email"
            assert "predictions_count" in member, "Member should have predictions_count"
            assert "leagues_count" in member, "Member should have leagues_count"
            # Verify password is NOT included
            assert "password_hash" not in member, "Password hash should not be exposed"

        print(f"PASS: Admin members endpoint returns {len(data)} members")

    def test_admin_members_requires_admin(self, api_session, user_headers):
        """Admin members endpoint should require admin access"""
        response = api_session.get(f"{BASE_URL}/api/admin/members", headers=user_headers)

        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("PASS: Admin members endpoint requires admin access")

    def test_admin_members_requires_authentication(self, api_session):
        """Admin members endpoint should require authentication"""
        response = api_session.get(f"{BASE_URL}/api/admin/members")

        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Admin members endpoint requires authentication")


class TestAdminMemberDetailsEndpoint:
    """Tests for GET /api/admin/members/{member_id} endpoint"""

    def test_admin_member_details_returns_full_info(self, api_session, admin_headers, admin_user):
        """Admin member details endpoint should return complete member info"""
        member_id = admin_user["user_id"]

        response = api_session.get(f"{BASE_URL}/api/admin/members/{member_id}", headers=admin_headers)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        # Verify expected fields
        assert data.get("id") == member_id, "Should return correct member"
        assert "email" in data, "Should include email"
        assert "username" in data, "Should include username"
        assert "level" in data, "Should include level"
        assert "xp" in data, "Should include XP"
        assert "stats" in data, "Should include stats"
        assert "leagues" in data, "Should include leagues list"
        assert "recent_predictions" in data, "Should include recent predictions"

        # Verify stats structure
        stats = data.get("stats", {})
        assert "predictions_count" in stats, "Stats should have predictions_count"
        assert "correct_poles" in stats, "Stats should have correct_poles"

        print(f"PASS: Admin member details returns complete info for member {member_id}")

    def test_admin_member_details_returns_404_for_invalid_id(self, api_session, admin_headers):
        """Admin member details should return 404 for invalid member ID"""
        response = api_session.get(f"{BASE_URL}/api/admin/members/invalid-id-12345", headers=admin_headers)

        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Admin member details returns 404 for invalid ID")

    def test_admin_member_details_requires_admin(self, api_session, user_headers, test_user):
        """Admin member details should require admin access"""
        member_id = test_user["user_id"]

        response = api_session.get(f"{BASE_URL}/api/admin/members/{member_id}", headers=user_headers)

        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("PASS: Admin member details requires admin access")


# ==================== RACE INFO TESTS ====================


class TestRaceInfoForSprintWeekends:
    """Tests for race information on sprint weekends"""

    def test_miami_race_has_sprint_close_times(self, api_session):
        """Miami race should have sprint_predictions_close_at field"""
        response = api_session.get(f"{BASE_URL}/api/races/{SPRINT_RACE_ID}")

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert data.get("is_sprint_weekend") == True, "Miami should be sprint weekend"
        assert data.get("sprint_predictions_close_at") is not None, "Should have sprint_predictions_close_at"
        assert data.get("predictions_close_at") is not None, "Should have predictions_close_at"
        assert data.get("can_predict") is not None, "Should have can_predict flag"
        assert data.get("can_predict_sprint") is not None, "Should have can_predict_sprint flag"

        print("PASS: Miami race has correct sprint weekend fields")
        print(f"  - Sprint predictions close: {data.get('sprint_predictions_close_at')}")
        print(f"  - Main predictions close: {data.get('predictions_close_at')}")
        print(f"  - Can predict sprint: {data.get('can_predict_sprint')}")
        print(f"  - Can predict main: {data.get('can_predict')}")

    def test_upcoming_races_include_sprint_info(self, api_session):
        """Upcoming races endpoint should include sprint prediction info"""
        response = api_session.get(f"{BASE_URL}/api/races/upcoming")

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert isinstance(data, list), "Should return list of races"

        # Find Miami sprint race
        miami = next((r for r in data if r.get("id") == SPRINT_RACE_ID), None)

        if miami:
            assert miami.get("is_sprint_weekend") == True, "Miami should be sprint weekend"
            assert "sprint_predictions_close_at" in miami, "Should have sprint close time"
            assert "can_predict_sprint" in miami, "Should have can_predict_sprint flag"
            print("PASS: Upcoming races include sprint prediction info")
        else:
            print("INFO: Miami not in upcoming races list (may have passed)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
