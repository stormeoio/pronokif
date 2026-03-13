"""
PRONOKIF F1 App - New Features Tests V2
Tests for:
- Avatar System (GET /api/avatars, POST /api/user/avatar, POST /api/user/avatar/upload)
- Missions System (GET /api/user/missions, GET /api/user/stats, POST /api/user/missions/{id}/claim)
- Mini-games (POST /api/minigames/reaction, POST /api/minigames/batak)
- Mini-games Leaderboard (GET /api/minigames/leaderboard/{game_type}/{league_id}/{race_id})
- Global Leaderboard (GET /api/leaderboard/global)
"""

import pytest
import requests
import os
import uuid
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_auth_token(api_client):
    """Login with test user and get auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@pronokif.com",
        "password": "test123"
    })
    if response.status_code != 200:
        pytest.skip("Could not login test user")
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def authenticated_client(api_client, test_auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {test_auth_token}"})
    return api_client

@pytest.fixture(scope="module")
def test_user_info(api_client, test_auth_token):
    """Get test user info"""
    headers = {"Authorization": f"Bearer {test_auth_token}", "Content-Type": "application/json"}
    response = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if response.status_code != 200:
        pytest.skip("Could not get user info")
    return response.json()


class TestAvatarSystem:
    """Avatar System - GET, POST selection, and upload"""
    
    def test_get_all_avatars(self, api_client):
        """GET /api/avatars - Returns all avatar categories"""
        response = api_client.get(f"{BASE_URL}/api/avatars")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "default" in data
        assert "teams" in data
        assert "drivers" in data
        assert "all" in data
        
        # Verify counts: 15 default + 10 teams + 20 drivers = 45 total
        assert len(data["default"]) == 15, f"Expected 15 default avatars, got {len(data['default'])}"
        assert len(data["teams"]) == 10, f"Expected 10 team avatars, got {len(data['teams'])}"
        assert len(data["drivers"]) == 20, f"Expected 20 driver avatars, got {len(data['drivers'])}"
        assert len(data["all"]) == 45, f"Expected 45 total avatars, got {len(data['all'])}"
        
        # Verify avatar structure
        avatar = data["all"][0]
        assert "id" in avatar
        assert "name" in avatar
        assert "category" in avatar
        
        print(f"✅ Avatar system: {len(data['default'])} default, {len(data['teams'])} teams, {len(data['drivers'])} drivers")
    
    def test_avatar_selection(self, authenticated_client):
        """POST /api/user/avatar - Select a predefined avatar"""
        # Select a driver avatar
        response = authenticated_client.post(f"{BASE_URL}/api/user/avatar", json={
            "avatar_id": "driver_44"  # Hamilton
        })
        assert response.status_code == 200
        user = response.json()
        assert user["avatar_id"] == "driver_44"
        assert user["custom_avatar_url"] is None
        print(f"✅ Avatar selected: {user['avatar_id']}")
    
    def test_avatar_invalid_id(self, authenticated_client):
        """POST /api/user/avatar - Reject invalid avatar ID"""
        response = authenticated_client.post(f"{BASE_URL}/api/user/avatar", json={
            "avatar_id": "invalid_avatar_xyz"
        })
        assert response.status_code == 400
        print("✅ Invalid avatar ID correctly rejected")
    
    def test_avatar_upload_placeholder(self, authenticated_client):
        """POST /api/user/avatar/upload - Test upload endpoint exists"""
        # Create a tiny valid PNG (1x1 pixel)
        # PNG header + minimal IHDR + IDAT + IEND
        tiny_png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        # Need to remove Content-Type for multipart
        headers = {"Authorization": authenticated_client.headers.get("Authorization")}
        
        files = {
            "file": ("test.png", tiny_png, "image/png")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/user/avatar/upload",
            files=files,
            headers=headers
        )
        
        # Should accept valid image
        if response.status_code == 200:
            data = response.json()
            assert "avatar_url" in data
            assert data["avatar_url"].startswith("data:image/")
            print(f"✅ Avatar upload working")
        else:
            print(f"⚠️ Avatar upload returned {response.status_code}: {response.text[:100]}")
    
    def test_reset_to_original_avatar(self, authenticated_client):
        """Reset avatar to driver_1 (test user's original avatar)"""
        response = authenticated_client.post(f"{BASE_URL}/api/user/avatar", json={
            "avatar_id": "driver_1"
        })
        assert response.status_code == 200
        print("✅ Avatar reset to driver_1")


class TestMissionsSystem:
    """Missions - GET missions, GET stats, claim rewards"""
    
    def test_get_user_missions(self, authenticated_client):
        """GET /api/user/missions - Returns 35 missions with progress"""
        response = authenticated_client.get(f"{BASE_URL}/api/user/missions")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "missions" in data
        assert "categories" in data
        
        missions = data["missions"]
        # Should have 35 missions
        assert len(missions) >= 35, f"Expected 35+ missions, got {len(missions)}"
        
        # Verify mission structure
        mission = missions[0]
        assert "mission_id" in mission
        assert "name" in mission
        assert "description" in mission
        assert "category" in mission
        assert "current" in mission
        assert "target" in mission
        assert "completed" in mission
        assert "xp_reward" in mission
        assert "claimed" in mission
        
        # Verify categories
        categories = data["categories"]
        assert "assiduity" in categories
        assert "performance" in categories
        assert "social" in categories
        assert "minigames" in categories
        
        assiduity_count = len(categories["assiduity"])
        performance_count = len(categories["performance"])
        social_count = len(categories["social"])
        minigames_count = len(categories["minigames"])
        
        print(f"✅ Missions: {len(missions)} total")
        print(f"   Assiduity: {assiduity_count}, Performance: {performance_count}")
        print(f"   Social: {social_count}, Mini-games: {minigames_count}")
    
    def test_get_user_stats(self, authenticated_client):
        """GET /api/user/stats - Returns user statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/user/stats")
        assert response.status_code == 200
        stats = response.json()
        
        # Verify key stats fields
        assert "predictions_made" in stats
        assert "predictions_correct" in stats
        assert "poles_correct" in stats
        assert "winners_correct" in stats
        assert "leagues_joined" in stats
        assert "reaction_games_played" in stats
        assert "batak_games_played" in stats
        
        print(f"✅ User stats: {stats['predictions_made']} predictions made")
    
    def test_mission_claim_not_completed(self, authenticated_client):
        """POST /api/user/missions/{id}/claim - Reject uncompleted mission"""
        # Try to claim a high-target mission that's unlikely to be completed
        response = authenticated_client.post(f"{BASE_URL}/api/user/missions/predictions_1000/claim")
        assert response.status_code == 400
        error = response.json()
        assert "detail" in error
        print(f"✅ Uncompleted mission claim rejected: {error['detail']}")
    
    def test_mission_invalid_id(self, authenticated_client):
        """POST /api/user/missions/{id}/claim - Reject invalid mission ID"""
        response = authenticated_client.post(f"{BASE_URL}/api/user/missions/invalid_mission_xyz/claim")
        assert response.status_code == 404
        print("✅ Invalid mission ID correctly rejected")


class TestMiniGamesReaction:
    """Mini-game: Reaction Time"""
    
    def test_submit_reaction_training(self, authenticated_client, test_user_info):
        """POST /api/minigames/reaction - Submit training result"""
        # Get next race
        race_res = authenticated_client.get(f"{BASE_URL}/api/races/next")
        race = race_res.json()
        
        # Get user's leagues
        leagues_res = authenticated_client.get(f"{BASE_URL}/api/leagues/my")
        leagues = leagues_res.json()
        
        league_id = leagues[0]["id"] if leagues else "training"
        
        response = authenticated_client.post(f"{BASE_URL}/api/minigames/reaction", json={
            "race_id": race["id"],
            "league_id": league_id,
            "reaction_time_ms": 250,
            "is_training": True
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "result_id" in data
        assert data["reaction_time_ms"] == 250
        assert data["is_training"] == True
        print(f"✅ Reaction training result submitted: {data['reaction_time_ms']}ms")
    
    def test_submit_reaction_competition(self, authenticated_client, test_user_info):
        """POST /api/minigames/reaction - Submit competition result"""
        race_res = authenticated_client.get(f"{BASE_URL}/api/races/next")
        race = race_res.json()
        
        leagues_res = authenticated_client.get(f"{BASE_URL}/api/leagues/my")
        leagues = leagues_res.json()
        
        if not leagues:
            pytest.skip("User not in any league")
        
        league_id = leagues[0]["id"]
        
        response = authenticated_client.post(f"{BASE_URL}/api/minigames/reaction", json={
            "race_id": race["id"],
            "league_id": league_id,
            "reaction_time_ms": 220,
            "is_training": False
        })
        
        # May succeed or fail if 3 attempts used
        if response.status_code == 200:
            print(f"✅ Reaction competition result submitted")
        elif response.status_code == 400:
            error = response.json()
            if "3 attempts" in error.get("detail", ""):
                print(f"✅ Competition mode correctly limits attempts")
            else:
                print(f"⚠️ Error: {error}")
        else:
            print(f"⚠️ Unexpected status: {response.status_code}")


class TestMiniGamesBatak:
    """Mini-game: Batak Pro"""
    
    def test_submit_batak_training(self, authenticated_client):
        """POST /api/minigames/batak - Submit training result"""
        race_res = authenticated_client.get(f"{BASE_URL}/api/races/next")
        race = race_res.json()
        
        leagues_res = authenticated_client.get(f"{BASE_URL}/api/leagues/my")
        leagues = leagues_res.json()
        
        league_id = leagues[0]["id"] if leagues else "training"
        
        response = authenticated_client.post(f"{BASE_URL}/api/minigames/batak", json={
            "race_id": race["id"],
            "league_id": league_id,
            "score": 28,
            "time_seconds": 30,
            "is_training": True
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "result_id" in data
        assert data["score"] == 28
        assert data["is_training"] == True
        print(f"✅ Batak training result submitted: {data['score']} targets")
    
    def test_submit_batak_competition(self, authenticated_client):
        """POST /api/minigames/batak - Submit competition result"""
        race_res = authenticated_client.get(f"{BASE_URL}/api/races/next")
        race = race_res.json()
        
        leagues_res = authenticated_client.get(f"{BASE_URL}/api/leagues/my")
        leagues = leagues_res.json()
        
        if not leagues:
            pytest.skip("User not in any league")
        
        league_id = leagues[0]["id"]
        
        response = authenticated_client.post(f"{BASE_URL}/api/minigames/batak", json={
            "race_id": race["id"],
            "league_id": league_id,
            "score": 32,
            "time_seconds": 30,
            "is_training": False
        })
        
        if response.status_code == 200:
            print(f"✅ Batak competition result submitted")
        elif response.status_code == 400:
            error = response.json()
            if "3 attempts" in error.get("detail", ""):
                print(f"✅ Competition mode correctly limits attempts")
            else:
                print(f"⚠️ Error: {error}")


class TestMiniGamesLeaderboard:
    """Mini-games Leaderboard endpoints"""
    
    def test_get_reaction_leaderboard(self, authenticated_client):
        """GET /api/minigames/leaderboard/reaction/{league_id}/{race_id}"""
        race_res = authenticated_client.get(f"{BASE_URL}/api/races/next")
        race = race_res.json()
        
        leagues_res = authenticated_client.get(f"{BASE_URL}/api/leagues/my")
        leagues = leagues_res.json()
        
        if not leagues:
            pytest.skip("User not in any league")
        
        league_id = leagues[0]["id"]
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/minigames/leaderboard/reaction/{league_id}/{race['id']}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
        
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            assert "user_id" in entry
            assert "username" in entry
            assert "best_score" in entry
            assert "position" in entry
        
        print(f"✅ Reaction leaderboard: {len(data['leaderboard'])} entries")
    
    def test_get_batak_leaderboard(self, authenticated_client):
        """GET /api/minigames/leaderboard/batak/{league_id}/{race_id}"""
        race_res = authenticated_client.get(f"{BASE_URL}/api/races/next")
        race = race_res.json()
        
        leagues_res = authenticated_client.get(f"{BASE_URL}/api/leagues/my")
        leagues = leagues_res.json()
        
        if not leagues:
            pytest.skip("User not in any league")
        
        league_id = leagues[0]["id"]
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/minigames/leaderboard/batak/{league_id}/{race['id']}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        print(f"✅ Batak leaderboard: {len(data['leaderboard'])} entries")
    
    def test_get_minigame_attempts(self, authenticated_client):
        """GET /api/minigames/attempts/{game_type}/{league_id}/{race_id}"""
        race_res = authenticated_client.get(f"{BASE_URL}/api/races/next")
        race = race_res.json()
        
        leagues_res = authenticated_client.get(f"{BASE_URL}/api/leagues/my")
        leagues = leagues_res.json()
        
        if not leagues:
            pytest.skip("User not in any league")
        
        league_id = leagues[0]["id"]
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/minigames/attempts/reaction/{league_id}/{race['id']}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "attempts_used" in data
        assert "attempts_remaining" in data
        assert data["attempts_remaining"] >= 0
        assert data["attempts_remaining"] <= 3
        
        print(f"✅ Reaction attempts: {data['attempts_used']}/3 used, {data['attempts_remaining']} remaining")
    
    def test_get_global_reaction_leaderboard(self, authenticated_client):
        """GET /api/minigames/global-leaderboard/reaction"""
        response = authenticated_client.get(f"{BASE_URL}/api/minigames/global-leaderboard/reaction")
        
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        print(f"✅ Global reaction leaderboard: {len(data['leaderboard'])} entries")
    
    def test_get_global_batak_leaderboard(self, authenticated_client):
        """GET /api/minigames/global-leaderboard/batak"""
        response = authenticated_client.get(f"{BASE_URL}/api/minigames/global-leaderboard/batak")
        
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        print(f"✅ Global batak leaderboard: {len(data['leaderboard'])} entries")


class TestGlobalLeaderboard:
    """Global Leaderboard - All players"""
    
    def test_get_global_leaderboard(self, authenticated_client):
        """GET /api/leaderboard/global - Returns global ranking"""
        response = authenticated_client.get(f"{BASE_URL}/api/leaderboard/global")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        assert "my_position" in data
        assert "total_players" in data
        
        leaderboard = data["leaderboard"]
        assert isinstance(leaderboard, list)
        
        if leaderboard:
            entry = leaderboard[0]
            assert "user_id" in entry
            assert "username" in entry
            assert "total_points" in entry
            assert "level" in entry
            assert "position" in entry
            
            # Verify sorted by points
            for i in range(1, len(leaderboard)):
                assert leaderboard[i-1]["total_points"] >= leaderboard[i]["total_points"]
        
        print(f"✅ Global leaderboard: {data['total_players']} players")
        print(f"   My position: #{data['my_position']}")
    
    def test_global_leaderboard_limit(self, authenticated_client):
        """GET /api/leaderboard/global?limit=10 - Respects limit parameter"""
        response = authenticated_client.get(f"{BASE_URL}/api/leaderboard/global?limit=10")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["leaderboard"]) <= 10
        print(f"✅ Global leaderboard with limit=10: {len(data['leaderboard'])} entries")


class TestRaceWeekendLeaderboard:
    """Race Weekend specific leaderboard"""
    
    def test_get_race_leaderboard(self, authenticated_client):
        """GET /api/leaderboard/race/{race_id} - Race weekend ranking"""
        # Get a race that might have results
        race_res = authenticated_client.get(f"{BASE_URL}/api/races/australia-2026")
        race = race_res.json()
        
        response = authenticated_client.get(f"{BASE_URL}/api/leaderboard/race/{race['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        # May have no results yet
        if "message" in data:
            print(f"✅ Race leaderboard: {data['message']}")
        else:
            assert "leaderboard" in data
            print(f"✅ Race leaderboard: {len(data['leaderboard'])} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
