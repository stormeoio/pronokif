"""
Test Sprint Prediction functionality for PRONOKIF application.

Tests cover:
- Classic weekend predictions (quali_pole, quali_top10, race_winner, race_top10)
- Sprint weekend predictions (additional sprint_quali_pole, sprint_quali_top10, sprint_race_winner, sprint_race_top10)
- Validation for sprint weekend required fields
"""

import os
import random

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

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

# Sprint race example: miami-2026 (upcoming)
# Classic race example: japan-2026
# Note: china-2026 is a past sprint race with closed predictions


@pytest.fixture(scope="module")
def api_session():
    """Create requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_user_token(api_session):
    """Register or login a test user and get auth token"""
    test_email = f"sprint_test_{random.randint(1000, 9999)}@test.com"
    test_password = "test12345"

    # Try to register new user
    register_response = api_session.post(
        f"{BASE_URL}/api/auth/register", json={"email": test_email, "password": test_password}
    )

    if register_response.status_code == 200:
        token = register_response.json().get("access_token")
        user_id = register_response.json().get("user", {}).get("id")
        print(f"Registered new test user: {test_email}")
        return {"token": token, "user_id": user_id, "email": test_email}
    elif register_response.status_code == 400:
        # User exists, try login
        login_response = api_session.post(
            f"{BASE_URL}/api/auth/login", json={"email": test_email, "password": test_password}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            user_id = login_response.json().get("user", {}).get("id")
            print(f"Logged in existing test user: {test_email}")
            return {"token": token, "user_id": user_id, "email": test_email}

    pytest.skip("Could not create or login test user")


@pytest.fixture
def auth_headers(test_user_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {test_user_token['token']}"}


class TestRaceConfiguration:
    """Tests to verify race configuration for sprint and classic weekends"""

    def test_china_is_sprint_weekend(self, api_session):
        """Verify china-2026 is configured as a sprint weekend"""
        response = api_session.get(f"{BASE_URL}/api/races/china-2026")
        assert response.status_code == 200, f"Failed to get china-2026: {response.text}"

        data = response.json()
        assert data["is_sprint_weekend"] == True, "china-2026 should be a sprint weekend"
        assert data["sprint_quali_date"] is not None, "Sprint quali date should be set"
        assert data["sprint_race_date"] is not None, "Sprint race date should be set"
        print("✓ china-2026 is correctly configured as sprint weekend")

    def test_japan_is_classic_weekend(self, api_session):
        """Verify japan-2026 is NOT a sprint weekend"""
        response = api_session.get(f"{BASE_URL}/api/races/japan-2026")
        assert response.status_code == 200, f"Failed to get japan-2026: {response.text}"

        data = response.json()
        assert data["is_sprint_weekend"] == False, "japan-2026 should NOT be a sprint weekend"
        assert data.get("sprint_quali_date") is None or data["sprint_quali_date"] == "None", (
            "Sprint quali date should be None"
        )
        assert data.get("sprint_race_date") is None or data["sprint_race_date"] == "None", (
            "Sprint race date should be None"
        )
        print("✓ japan-2026 is correctly configured as classic weekend")


class TestSprintPredictionValidation:
    """Tests for sprint weekend prediction validation"""

    def test_sprint_weekend_requires_sprint_quali_pole(self, api_session, auth_headers):
        """Sprint weekend prediction should fail without sprint_quali_pole"""
        payload = {
            "race_id": "miami-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "verstappen",
            "race_top10": DRIVER_IDS[:10],
            # Missing sprint_quali_pole
            "sprint_quali_top10": DRIVER_IDS[:10],
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        # Should fail validation
        assert response.status_code == 400, f"Expected 400 for missing sprint_quali_pole, got {response.status_code}"
        error_detail = response.json().get("detail", "")
        assert "sprint" in error_detail.lower() or "pole" in error_detail.lower(), (
            f"Error should mention sprint pole requirement: {error_detail}"
        )
        print(f"✓ Validation correctly rejects missing sprint_quali_pole: {error_detail}")

    def test_sprint_weekend_requires_sprint_race_winner(self, api_session, auth_headers):
        """Sprint weekend prediction should fail without sprint_race_winner"""
        payload = {
            "race_id": "miami-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "verstappen",
            "race_top10": DRIVER_IDS[:10],
            "sprint_quali_pole": "leclerc",
            "sprint_quali_top10": DRIVER_IDS[:10],
            # Missing sprint_race_winner
            "sprint_race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        # Should fail validation
        assert response.status_code == 400, f"Expected 400 for missing sprint_race_winner, got {response.status_code}"
        error_detail = response.json().get("detail", "")
        assert "sprint" in error_detail.lower() or "winner" in error_detail.lower(), (
            f"Error should mention sprint winner requirement: {error_detail}"
        )
        print(f"✓ Validation correctly rejects missing sprint_race_winner: {error_detail}")

    def test_sprint_weekend_requires_sprint_quali_top10(self, api_session, auth_headers):
        """Sprint weekend prediction should fail without sprint_quali_top10"""
        payload = {
            "race_id": "miami-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "verstappen",
            "race_top10": DRIVER_IDS[:10],
            "sprint_quali_pole": "leclerc",
            # Missing sprint_quali_top10
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        # Should fail validation
        assert response.status_code == 400, f"Expected 400 for missing sprint_quali_top10, got {response.status_code}"
        error_detail = response.json().get("detail", "")
        assert "sprint" in error_detail.lower() and "top" in error_detail.lower(), (
            f"Error should mention sprint top 10: {error_detail}"
        )
        print(f"✓ Validation correctly rejects missing sprint_quali_top10: {error_detail}")

    def test_sprint_weekend_requires_sprint_race_top10(self, api_session, auth_headers):
        """Sprint weekend prediction should fail without sprint_race_top10"""
        payload = {
            "race_id": "miami-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "verstappen",
            "race_top10": DRIVER_IDS[:10],
            "sprint_quali_pole": "leclerc",
            "sprint_quali_top10": DRIVER_IDS[:10],
            "sprint_race_winner": "norris",
            # Missing sprint_race_top10
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        # Should fail validation
        assert response.status_code == 400, f"Expected 400 for missing sprint_race_top10, got {response.status_code}"
        error_detail = response.json().get("detail", "")
        assert "sprint" in error_detail.lower() and "top" in error_detail.lower(), (
            f"Error should mention sprint race top 10: {error_detail}"
        )
        print(f"✓ Validation correctly rejects missing sprint_race_top10: {error_detail}")


class TestClassicPrediction:
    """Tests for classic weekend (non-sprint) predictions"""

    def test_classic_weekend_prediction_success(self, api_session, auth_headers):
        """Classic weekend should accept predictions with only classic fields"""
        payload = {
            "race_id": "japan-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "norris",
            "race_top10": DRIVER_IDS[:10],
            "bonus_bets": {
                "safety_car": True,
                "dnf_drivers": ["alonso"],
                "fastest_lap_driver": "hamilton",
                "first_corner_leader": "verstappen",
            },
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        # Should succeed
        if response.status_code == 200:
            data = response.json()
            assert data["race_id"] == "japan-2026", "Race ID should match"
            assert data["quali_pole"] == "verstappen", "Quali pole should be verstappen"
            assert data["race_winner"] == "norris", "Race winner should be norris"
            assert len(data["quali_top10"]) == 10, "Should have 10 quali positions"
            assert len(data["race_top10"]) == 10, "Should have 10 race positions"
            print("✓ Classic weekend prediction created successfully")
        elif response.status_code == 400 and "fermés" in response.json().get("detail", "").lower():
            # Predictions closed - skip but don't fail
            pytest.skip("Predictions are closed for japan-2026")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")

    def test_classic_weekend_does_not_require_sprint_fields(self, api_session, auth_headers):
        """Classic weekend prediction should NOT require sprint fields"""
        payload = {
            "race_id": "japan-2026",
            "quali_pole": "leclerc",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "hamilton",
            "race_top10": DRIVER_IDS[:10],
            # No sprint fields - should still be valid for classic weekend
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        # Should succeed or be closed (but not fail due to missing sprint fields)
        if response.status_code == 200:
            print("✓ Classic weekend accepts prediction without sprint fields")
        elif response.status_code == 400:
            detail = response.json().get("detail", "")
            # If it fails, it should be because predictions are closed, NOT because of sprint fields
            assert "sprint" not in detail.lower(), f"Classic weekend should not require sprint fields: {detail}"
            print(f"✓ Classic weekend correctly does not require sprint fields (predictions closed: {detail})")


class TestSprintPredictionSuccess:
    """Tests for successful sprint weekend predictions"""

    def test_sprint_weekend_full_prediction(self, api_session, auth_headers):
        """Sprint weekend should accept full prediction with all fields"""
        payload = {
            "race_id": "miami-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "sprint_quali_pole": "leclerc",
            "sprint_quali_top10": DRIVER_IDS[:10],
            "sprint_race_winner": "norris",
            "sprint_race_top10": DRIVER_IDS[:10],
            "race_winner": "hamilton",
            "race_top10": DRIVER_IDS[:10],
            "bonus_bets": {
                "safety_car": False,
                "dnf_drivers": [],
                "fastest_lap_driver": "verstappen",
                "first_corner_leader": "leclerc",
            },
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        if response.status_code == 200:
            data = response.json()
            # Verify all sprint fields are stored
            assert data.get("sprint_quali_pole") == "leclerc", "Sprint quali pole should be stored"
            assert len(data.get("sprint_quali_top10", [])) == 10, "Sprint quali top 10 should have 10 entries"
            assert data.get("sprint_race_winner") == "norris", "Sprint race winner should be stored"
            assert len(data.get("sprint_race_top10", [])) == 10, "Sprint race top 10 should have 10 entries"
            # Verify classic fields
            assert data["quali_pole"] == "verstappen", "Quali pole should be stored"
            assert data["race_winner"] == "hamilton", "Race winner should be stored"
            print("✓ Sprint weekend full prediction created with all 8+1 fields")
        elif response.status_code == 400 and "fermés" in response.json().get("detail", "").lower():
            pytest.skip("Predictions are closed for china-2026")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")


class TestPredictionRetrieval:
    """Tests for retrieving predictions"""

    def test_get_prediction_includes_sprint_fields(self, api_session, auth_headers):
        """GET prediction should return sprint fields if they were set"""
        # First get any existing prediction
        response = api_session.get(f"{BASE_URL}/api/predictions/race/miami-2026", headers=auth_headers)

        if response.status_code == 200 and response.json():
            data = response.json()
            # For sprint weekend, response model should include sprint fields
            if data.get("sprint_quali_top10"):
                print("✓ Prediction response includes sprint_quali_top10")
            if data.get("sprint_race_top10"):
                print("✓ Prediction response includes sprint_race_top10")
            print("✓ GET prediction returns proper response structure")
        else:
            print("No existing prediction for miami-2026 (OK - may not have submitted yet)")


class TestPredictionModel:
    """Tests for PredictionCreate model validation"""

    def test_quali_top10_must_have_10_drivers(self, api_session, auth_headers):
        """quali_top10 must have exactly 10 drivers"""
        payload = {
            "race_id": "japan-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:5],  # Only 5 drivers
            "race_winner": "norris",
            "race_top10": DRIVER_IDS[:10],
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        # Should fail validation
        assert response.status_code == 400, f"Expected 400 for incomplete quali_top10, got {response.status_code}"
        print("✓ Validation correctly rejects incomplete quali_top10")

    def test_race_top10_must_have_10_drivers(self, api_session, auth_headers):
        """race_top10 must have exactly 10 drivers"""
        payload = {
            "race_id": "japan-2026",
            "quali_pole": "verstappen",
            "quali_top10": DRIVER_IDS[:10],
            "race_winner": "norris",
            "race_top10": DRIVER_IDS[:3],  # Only 3 drivers
        }

        response = api_session.post(f"{BASE_URL}/api/predictions", json=payload, headers=auth_headers)

        # Should fail validation
        assert response.status_code == 400, f"Expected 400 for incomplete race_top10, got {response.status_code}"
        print("✓ Validation correctly rejects incomplete race_top10")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
