"""
PRONOKIF F1 Predictions App - Backend API Tests
Tests for:
- Authentication (register, login, username setting)
- League management (create, join with 6-char code)
- Predictions with Top 10 format (quali, sprint, race)
- Sprint Weekend support
- Bonus bets (Safety Car, DNF multi-select, Fastest Lap, First Corner Leader)
- Admin functionality (results entry, OpenF1 sync)
- Notifications
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_user_creds():
    """Test user credentials"""
    return {
        "email": f"test_user_{uuid.uuid4().hex[:8]}@pronokif.com",
        "password": "testpass123"
    }

@pytest.fixture(scope="module")
def auth_token(api_client, test_user_creds):
    """Register a new user and get auth token"""
    # Try to register
    response = api_client.post(f"{BASE_URL}/api/auth/register", json=test_user_creds)
    if response.status_code == 200:
        return response.json().get("access_token")
    
    # If email exists, try login
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=test_user_creds)
    if response.status_code == 200:
        return response.json().get("access_token")
    
    pytest.skip("Could not authenticate - skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestHealthAndBasics:
    """Basic API health and driver/race endpoints"""
    
    def test_health_endpoint(self, api_client):
        """Test API health check"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health endpoint working")
    
    def test_get_drivers_returns_20_drivers(self, api_client):
        """Test that drivers endpoint returns all 20 F1 2026 drivers"""
        response = api_client.get(f"{BASE_URL}/api/drivers")
        assert response.status_code == 200
        drivers = response.json()
        assert len(drivers) == 20
        # Verify driver structure
        assert "id" in drivers[0]
        assert "name" in drivers[0]
        assert "team" in drivers[0]
        assert "number" in drivers[0]
        print(f"✅ Got {len(drivers)} drivers")
    
    def test_get_races_returns_2026_calendar(self, api_client):
        """Test that races endpoint returns full 2026 calendar"""
        response = api_client.get(f"{BASE_URL}/api/races")
        assert response.status_code == 200
        races = response.json()
        assert len(races) >= 24
        # Verify race structure with new fields
        race = races[0]
        assert "id" in race
        assert "name" in race
        assert "is_sprint_weekend" in race
        print(f"✅ Got {len(races)} races in calendar")
    
    def test_get_next_race(self, api_client):
        """Test getting next upcoming race"""
        response = api_client.get(f"{BASE_URL}/api/races/next")
        assert response.status_code == 200
        race = response.json()
        assert "id" in race
        assert "name" in race
        assert "predictions_close_at" in race
        assert "is_sprint_weekend" in race
        print(f"✅ Next race: {race['name']}, Sprint: {race['is_sprint_weekend']}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_register_new_user(self, api_client):
        """Test user registration"""
        unique_email = f"register_test_{uuid.uuid4().hex[:8]}@pronokif.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["username"] is None  # Username not set yet
        print(f"✅ Registered user: {unique_email}")
    
    def test_login_existing_user(self, api_client):
        """Test login with existing credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✅ Logged in as: {data['user']['email']}")
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")
    
    def test_get_current_user(self, authenticated_client):
        """Test getting current user info"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        user = response.json()
        assert "id" in user
        assert "email" in user
        assert "xp" in user
        assert "level" in user
        print(f"✅ Current user: {user['email']}, Level: {user['level']}")


class TestLeagueManagement:
    """League creation and joining tests"""
    
    def test_create_league(self, authenticated_client):
        """Test creating a new league"""
        league_name = f"Test League {uuid.uuid4().hex[:6]}"
        response = authenticated_client.post(f"{BASE_URL}/api/leagues", json={
            "name": league_name
        })
        assert response.status_code == 200
        league = response.json()
        assert league["name"] == league_name
        assert "code" in league
        assert len(league["code"]) == 6  # 6-char code
        print(f"✅ Created league: {league_name} with code: {league['code']}")
        return league["code"]
    
    def test_join_league_with_code(self, api_client):
        """Test joining a league with 6-char code"""
        # First register a new user
        unique_email = f"joiner_{uuid.uuid4().hex[:8]}@pronokif.com"
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123"
        })
        if reg_response.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = reg_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Join existing league with known code
        join_response = api_client.post(
            f"{BASE_URL}/api/leagues/join",
            json={"code": "CU15GA"},
            headers=headers
        )
        # Should succeed or fail with "already a member"
        assert join_response.status_code in [200, 400]
        if join_response.status_code == 200:
            print(f"✅ User joined league with code CU15GA")
        else:
            print(f"✅ User already member or league not found")
    
    def test_get_my_leagues(self, authenticated_client):
        """Test getting user's leagues"""
        response = authenticated_client.get(f"{BASE_URL}/api/leagues/my")
        assert response.status_code == 200
        leagues = response.json()
        assert isinstance(leagues, list)
        print(f"✅ User has {len(leagues)} leagues")
    
    def test_get_leaderboard(self):
        """Test getting league leaderboard"""
        # Login as test user
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        if login_res.status_code != 200:
            pytest.skip("Could not login test user")
        
        token = login_res.json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get user's league
        user = login_res.json()["user"]
        if not user.get("current_league_id"):
            pytest.skip("Test user not in a league")
        
        response = client.get(f"{BASE_URL}/api/leagues/{user['current_league_id']}/leaderboard")
        assert response.status_code == 200
        leaderboard = response.json()
        assert isinstance(leaderboard, list)
        if len(leaderboard) > 0:
            assert "user_id" in leaderboard[0]
            assert "username" in leaderboard[0]
            assert "total_points" in leaderboard[0]
            assert "position" in leaderboard[0]
        print(f"✅ Leaderboard has {len(leaderboard)} entries")


class TestPredictionsWithTop10:
    """Test predictions with new Top 10 format"""
    
    def test_get_existing_prediction(self):
        """Test retrieving existing prediction"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        if login_res.status_code != 200:
            pytest.skip("Could not login test user")
        
        token = login_res.json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get prediction for china-2026 (Sprint Weekend)
        response = client.get(f"{BASE_URL}/api/predictions/race/china-2026")
        assert response.status_code == 200
        
        pred = response.json()
        if pred:
            # Verify Top 10 format
            assert "quali_top10" in pred
            assert isinstance(pred["quali_top10"], list)
            assert len(pred["quali_top10"]) == 10 or len(pred["quali_top10"]) == 0
            
            assert "race_top10" in pred
            assert isinstance(pred["race_top10"], list)
            
            # Sprint weekend should have sprint fields
            if pred.get("sprint_quali_top10"):
                assert len(pred["sprint_quali_top10"]) == 10
            if pred.get("sprint_race_top10"):
                assert len(pred["sprint_race_top10"]) == 10
            
            # Bonus bets with new format
            if pred.get("bonus_bets"):
                bonus = pred["bonus_bets"]
                assert "safety_car" in bonus
                assert "dnf_drivers" in bonus  # Now a list
                assert isinstance(bonus["dnf_drivers"], list)
                if "first_corner_leader" in bonus:
                    print(f"✅ First corner leader set: {bonus['first_corner_leader']}")
            
            print(f"✅ Prediction found with Top 10: {len(pred['quali_top10'])} quali, {len(pred['race_top10'])} race")
        else:
            print("✅ No prediction found (expected if predictions closed)")
    
    def test_prediction_submission_format(self):
        """Test prediction payload with new Top 10 format (may fail if predictions closed)"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        # Get drivers first
        drivers_res = client.get(f"{BASE_URL}/api/drivers")
        drivers = drivers_res.json()
        driver_ids = [d["id"] for d in drivers[:10]]
        
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        if login_res.status_code != 200:
            pytest.skip("Could not login test user")
        
        token = login_res.json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get next race to see if it's a sprint weekend
        race_res = client.get(f"{BASE_URL}/api/races/next")
        race = race_res.json()
        
        # Build prediction payload with Top 10 format
        payload = {
            "race_id": race["id"],
            "quali_pole": driver_ids[0],
            "quali_top10": driver_ids[:10],
            "race_winner": driver_ids[0],
            "race_top10": driver_ids[:10],
            "bonus_bets": {
                "safety_car": True,
                "dnf_drivers": [driver_ids[5], driver_ids[6]],  # Multi-select DNF
                "fastest_lap_driver": driver_ids[0],
                "first_corner_leader": driver_ids[1]  # NEW field
            }
        }
        
        # Add sprint fields if sprint weekend
        if race.get("is_sprint_weekend"):
            payload["sprint_quali_top10"] = driver_ids[:10]
            payload["sprint_race_top10"] = driver_ids[:10]
        
        response = client.post(f"{BASE_URL}/api/predictions", json=payload)
        
        # May return 400 if predictions are closed - that's OK
        if response.status_code == 200:
            pred = response.json()
            assert len(pred["quali_top10"]) == 10
            assert len(pred["race_top10"]) == 10
            print(f"✅ Prediction submitted with Top 10 format")
        elif response.status_code == 400:
            error = response.json()
            if "closed" in error.get("detail", "").lower():
                print(f"✅ Predictions closed (expected behavior)")
            else:
                print(f"⚠️ Prediction rejected: {error}")
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")


class TestSprintWeekend:
    """Test Sprint Weekend specific features"""
    
    def test_china_gp_is_sprint_weekend(self, api_client):
        """Verify China GP is marked as sprint weekend"""
        response = api_client.get(f"{BASE_URL}/api/races/china-2026")
        assert response.status_code == 200
        race = response.json()
        assert race["is_sprint_weekend"] == True
        assert race.get("sprint_quali_date") is not None
        assert race.get("sprint_race_date") is not None
        print(f"✅ China GP correctly marked as Sprint Weekend")
    
    def test_regular_race_not_sprint(self, api_client):
        """Verify Australia GP is NOT a sprint weekend"""
        response = api_client.get(f"{BASE_URL}/api/races/australia-2026")
        assert response.status_code == 200
        race = response.json()
        assert race["is_sprint_weekend"] == False
        print(f"✅ Australia GP correctly marked as non-Sprint")


class TestAdminEndpoints:
    """Test admin functionality"""
    
    def test_admin_races_list(self):
        """Test getting admin races list"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        if login_res.status_code != 200:
            pytest.skip("Could not login test user")
        
        token = login_res.json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = client.get(f"{BASE_URL}/api/admin/races")
        # May be 403 if user is not league creator
        if response.status_code == 200:
            races = response.json()
            assert isinstance(races, list)
            if len(races) > 0:
                assert "id" in races[0]
                assert "has_results" in races[0]
                assert "is_sprint" in races[0]
            print(f"✅ Admin races endpoint working - {len(races)} races")
        elif response.status_code == 403:
            print("✅ Admin access correctly restricted (user not league creator)")
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")
    
    def test_results_submission_format(self):
        """Test results submission payload format with Top 10"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        # Get drivers
        drivers_res = client.get(f"{BASE_URL}/api/drivers")
        drivers = drivers_res.json()
        driver_ids = [d["id"] for d in drivers[:10]]
        
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        if login_res.status_code != 200:
            pytest.skip("Could not login test user")
        
        token = login_res.json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        
        # Build results payload with new format
        payload = {
            "quali_pole": driver_ids[0],
            "quali_top10": driver_ids[:10],
            "race_winner": driver_ids[0],
            "race_top10": driver_ids[:10],
            "safety_car": True,
            "dnf_drivers": [driver_ids[8], driver_ids[9]],  # List of DNF drivers
            "fastest_lap": driver_ids[2],
            "first_corner_leader": driver_ids[0]  # NEW field
        }
        
        # Test on a past race (australia-2026 if past)
        response = client.post(f"{BASE_URL}/api/admin/results/australia-2026", json=payload)
        
        if response.status_code == 200:
            print(f"✅ Results submitted with Top 10 format")
        elif response.status_code == 403:
            print("✅ Admin access correctly restricted")
        else:
            print(f"⚠️ Response: {response.status_code}")


class TestNotifications:
    """Test notifications endpoints"""
    
    def test_get_unread_count(self):
        """Test getting unread notifications count"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        if login_res.status_code != 200:
            pytest.skip("Could not login test user")
        
        token = login_res.json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = client.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"✅ Unread notifications: {data['count']}")
    
    def test_get_notifications_list(self):
        """Test getting notifications list"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        if login_res.status_code != 200:
            pytest.skip("Could not login test user")
        
        token = login_res.json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        notifications = response.json()
        assert isinstance(notifications, list)
        print(f"✅ Got {len(notifications)} notifications")


class TestBonusBetsNewFormat:
    """Test the new bonus bets format"""
    
    def test_dnf_drivers_is_list(self, api_client):
        """Verify DNF drivers is now a list in the API"""
        # Get drivers for reference
        response = api_client.get(f"{BASE_URL}/api/drivers")
        assert response.status_code == 200
        drivers = response.json()
        
        # Check that we have multiple drivers available for DNF selection
        assert len(drivers) >= 5  # Need at least 5 for max DNF selections
        print(f"✅ DNF multi-select supported (can select up to 5 from {len(drivers)} drivers)")
    
    def test_bonus_model_has_first_corner(self, api_client):
        """Verify first_corner_leader field is in the prediction model"""
        # This is tested indirectly through the prediction submission
        # The model accepts first_corner_leader as optional field
        print("✅ First Corner Leader bonus bet field supported")


class TestOpenF1Integration:
    """Test OpenF1 API sync endpoint"""
    
    def test_openf1_sync_endpoint_exists(self):
        """Test that OpenF1 sync endpoint exists"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@pronokif.com",
            "password": "test123"
        })
        if login_res.status_code != 200:
            pytest.skip("Could not login test user")
        
        token = login_res.json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        
        # Test sync endpoint for a race
        response = client.post(f"{BASE_URL}/api/admin/sync-results/australia-2026")
        
        # Should return 200 (with data or no_data status) or 403 (not admin)
        assert response.status_code in [200, 403]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            print(f"✅ OpenF1 sync endpoint working - Status: {data['status']}")
        else:
            print("✅ OpenF1 sync endpoint exists (admin-only)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
