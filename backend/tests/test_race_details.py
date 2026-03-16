"""
PRONOKIF F1 - Race Details & Upcoming Races API Tests
Tests for:
- /api/races/upcoming - Get all upcoming races for slider
- /api/races/{race_id}/details - Get race details with circuit info and session schedule
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestUpcomingRacesEndpoint:
    """Test /api/races/upcoming endpoint for slider functionality"""
    
    def test_upcoming_races_returns_list(self, api_client):
        """Test that endpoint returns a list of races"""
        response = api_client.get(f"{BASE_URL}/api/races/upcoming")
        assert response.status_code == 200
        races = response.json()
        assert isinstance(races, list)
        assert len(races) > 0
        print(f"✅ Got {len(races)} races in upcoming list")
    
    def test_upcoming_races_has_required_fields(self, api_client):
        """Test that each race has all required fields for slider"""
        response = api_client.get(f"{BASE_URL}/api/races/upcoming")
        races = response.json()
        
        required_fields = [
            "id", "name", "circuit", "country", "date", 
            "quali_date", "fp1_date", "predictions_close_at",
            "status", "can_predict", "is_sprint_weekend"
        ]
        
        for race in races[:3]:  # Check first 3 races
            for field in required_fields:
                assert field in race, f"Missing field: {field} in race {race.get('id')}"
        print("✅ All required fields present in upcoming races")
    
    def test_upcoming_races_status_values(self, api_client):
        """Test that status field has valid values"""
        response = api_client.get(f"{BASE_URL}/api/races/upcoming")
        races = response.json()
        
        valid_statuses = ["upcoming", "in_progress", "finished"]
        for race in races:
            assert race["status"] in valid_statuses, f"Invalid status: {race['status']}"
        print("✅ All races have valid status values")
    
    def test_can_predict_matches_status(self, api_client):
        """Test that can_predict is False for non-upcoming races"""
        response = api_client.get(f"{BASE_URL}/api/races/upcoming")
        races = response.json()
        
        for race in races:
            if race["status"] == "finished":
                assert race["can_predict"] == False, f"Finished race {race['id']} should not allow predictions"
            # Note: upcoming races may or may not allow predictions depending on time
        print("✅ can_predict field correctly set based on status")
    
    def test_sprint_weekends_marked_correctly(self, api_client):
        """Test that sprint weekends have is_sprint_weekend=True"""
        response = api_client.get(f"{BASE_URL}/api/races/upcoming")
        races = response.json()
        
        # Known sprint weekends in 2026: China, Miami, Austria, Austin, Brazil, Qatar
        sprint_ids = ["china-2026", "miami-2026", "austria-2026", "austin-2026", "brazil-2026", "qatar-2026"]
        
        for race in races:
            if race["id"] in sprint_ids:
                assert race["is_sprint_weekend"] == True, f"Race {race['id']} should be sprint weekend"
        print("✅ Sprint weekends correctly identified")


class TestRaceDetailsEndpoint:
    """Test /api/races/{race_id}/details endpoint"""
    
    def test_race_details_returns_circuit_info(self, api_client):
        """Test that race details include circuit information"""
        response = api_client.get(f"{BASE_URL}/api/races/australia-2026/details")
        assert response.status_code == 200
        data = response.json()
        
        assert "circuit" in data
        circuit = data["circuit"]
        
        # Check circuit fields
        assert "name" in circuit
        assert "full_name" in circuit
        assert "length_km" in circuit
        assert "turns" in circuit
        assert "laps" in circuit
        
        # Verify values for Albert Park
        assert circuit["name"] == "Albert Park"
        assert circuit["full_name"] == "Albert Park Circuit"
        assert circuit["length_km"] == 5.278
        assert circuit["turns"] == 14
        assert circuit["laps"] == 58
        
        print(f"✅ Circuit info: {circuit['full_name']} - {circuit['length_km']}km, {circuit['turns']} turns, {circuit['laps']} laps")
    
    def test_race_details_returns_sessions(self, api_client):
        """Test that race details include session schedule"""
        response = api_client.get(f"{BASE_URL}/api/races/australia-2026/details")
        data = response.json()
        
        assert "sessions" in data
        sessions = data["sessions"]
        assert isinstance(sessions, list)
        assert len(sessions) > 0
        
        # Check session structure
        for session in sessions:
            assert "name" in session
            assert "short_name" in session
            assert "datetime" in session
        
        print(f"✅ Found {len(sessions)} sessions in schedule")
    
    def test_standard_weekend_has_fp1_fp2_fp3(self, api_client):
        """Test that standard weekend has FP1, FP2, FP3, QUALI, COURSE"""
        response = api_client.get(f"{BASE_URL}/api/races/australia-2026/details")
        data = response.json()
        
        sessions = data["sessions"]
        short_names = [s["short_name"] for s in sessions]
        
        # Standard weekend should have all practice sessions
        assert "FP1" in short_names, "Missing FP1"
        assert "FP2" in short_names, "Missing FP2"
        assert "FP3" in short_names, "Missing FP3"
        assert "QUALI" in short_names, "Missing QUALI"
        assert "COURSE" in short_names, "Missing COURSE"
        
        # Standard weekend should NOT have sprint sessions
        assert "SQ" not in short_names, "Standard weekend should not have SQ"
        assert "SPRINT" not in short_names, "Standard weekend should not have SPRINT"
        
        print("✅ Standard weekend has correct sessions: FP1, FP2, FP3, QUALI, COURSE")
    
    def test_sprint_weekend_has_sq_and_sprint(self, api_client):
        """Test that sprint weekend has FP1, SQ, SPRINT, QUALI, COURSE (no FP2/FP3)"""
        response = api_client.get(f"{BASE_URL}/api/races/china-2026/details")
        data = response.json()
        
        assert data["is_sprint_weekend"] == True, "China GP should be sprint weekend"
        
        sessions = data["sessions"]
        short_names = [s["short_name"] for s in sessions]
        
        # Sprint weekend should have
        assert "FP1" in short_names, "Missing FP1"
        assert "SQ" in short_names, "Missing Sprint Shootout (SQ)"
        assert "SPRINT" in short_names, "Missing Sprint Race"
        assert "QUALI" in short_names, "Missing QUALI"
        assert "COURSE" in short_names, "Missing COURSE"
        
        # Sprint weekend should NOT have FP2/FP3
        assert "FP2" not in short_names, "Sprint weekend should not have FP2"
        assert "FP3" not in short_names, "Sprint weekend should not have FP3"
        
        print("✅ Sprint weekend has correct sessions: FP1, SQ, SPRINT, QUALI, COURSE")
    
    def test_sessions_sorted_by_datetime(self, api_client):
        """Test that sessions are sorted chronologically"""
        response = api_client.get(f"{BASE_URL}/api/races/australia-2026/details")
        data = response.json()
        
        sessions = data["sessions"]
        datetimes = [s["datetime"] for s in sessions]
        
        # Check that datetimes are sorted
        assert datetimes == sorted(datetimes), "Sessions should be sorted by datetime"
        print("✅ Sessions are correctly sorted by datetime")
    
    def test_race_not_found_returns_404(self, api_client):
        """Test that non-existent race returns 404"""
        response = api_client.get(f"{BASE_URL}/api/races/nonexistent-race/details")
        assert response.status_code == 404
        print("✅ Non-existent race correctly returns 404")
    
    def test_different_circuits_have_different_stats(self, api_client):
        """Test that different circuits return unique stats"""
        circuits_to_test = [
            ("australia-2026", "Albert Park", 5.278, 14, 58),
            ("china-2026", "Shanghai", 5.451, 16, 56),
            ("monaco-2026", "Monaco", 3.337, 19, 78),
            ("spa-2026", "Spa-Francorchamps", None, None, None),  # Check existence only
        ]
        
        for race_id, circuit_name, expected_length, expected_turns, expected_laps in circuits_to_test:
            response = api_client.get(f"{BASE_URL}/api/races/{race_id}/details")
            if response.status_code == 200:
                data = response.json()
                assert data["circuit"]["name"] == circuit_name
                if expected_length:
                    assert data["circuit"]["length_km"] == expected_length
                    assert data["circuit"]["turns"] == expected_turns
                    assert data["circuit"]["laps"] == expected_laps
                print(f"✅ {circuit_name} circuit info verified")
            else:
                print(f"⚠️ Race {race_id} not found")


class TestSessionTimeFormats:
    """Test session time formatting"""
    
    def test_session_datetime_is_iso_format(self, api_client):
        """Test that session datetime is in ISO 8601 format"""
        response = api_client.get(f"{BASE_URL}/api/races/australia-2026/details")
        data = response.json()
        
        for session in data["sessions"]:
            datetime_str = session["datetime"]
            # Should contain date, time, and timezone
            assert "T" in datetime_str, "DateTime should have T separator"
            assert ":" in datetime_str, "DateTime should have time component"
            assert "+" in datetime_str or "Z" in datetime_str, "DateTime should have timezone"
        print("✅ All session datetimes in ISO format")
    
    def test_session_names_in_french(self, api_client):
        """Test that session names are in French"""
        response = api_client.get(f"{BASE_URL}/api/races/australia-2026/details")
        data = response.json()
        
        french_names = {
            "FP1": "Essais Libres 1",
            "FP2": "Essais Libres 2",
            "FP3": "Essais Libres 3",
            "QUALI": "Qualifications",
            "COURSE": "Course"
        }
        
        for session in data["sessions"]:
            if session["short_name"] in french_names:
                assert session["name"] == french_names[session["short_name"]], \
                    f"Session {session['short_name']} should be named {french_names[session['short_name']]}"
        print("✅ Session names are in French")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
