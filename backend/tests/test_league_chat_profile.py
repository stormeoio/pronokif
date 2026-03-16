"""
PRONOKIF F1 App - League Chat and Public Profile Tests
Tests for new features (Jan 2026):
- League Chat: POST /api/leagues/{league_id}/messages - Send message
- League Chat: GET /api/leagues/{league_id}/messages - Get messages
- League Members: GET /api/leagues/{league_id}/members - Get members list
- Public Profile: GET /api/users/{user_id}/profile - Get public profile with stats
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
def test_auth_token(api_client):
    """Login with test user and get auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@pronokif.com",
        "password": "test123"
    })
    if response.status_code != 200:
        pytest.skip("Could not login test user")
    return response.json()

@pytest.fixture(scope="module")
def authenticated_client(api_client, test_auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {test_auth_token['access_token']}"})
    return api_client

@pytest.fixture(scope="module")
def test_user_info(test_auth_token):
    """Get test user info"""
    return test_auth_token["user"]

@pytest.fixture(scope="module")
def test_league_id(test_user_info):
    """Get test user's current league ID"""
    league_id = test_user_info.get("current_league_id")
    if not league_id:
        pytest.skip("Test user not in any league")
    return league_id


class TestLeagueChat:
    """League Chat - POST and GET messages"""
    
    def test_send_message_to_league(self, authenticated_client, test_league_id):
        """POST /api/leagues/{league_id}/messages - Send a chat message"""
        test_message = f"Test message from pytest at {uuid.uuid4().hex[:8]}"
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/leagues/{test_league_id}/messages",
            json={"content": test_message}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain message ID"
        assert "content" in data, "Response should contain content"
        assert "user_id" in data, "Response should contain user_id"
        assert "username" in data, "Response should contain username"
        assert "created_at" in data, "Response should contain created_at"
        assert data["content"] == test_message, f"Message content mismatch"
        
        print(f"✅ Chat message sent: '{test_message[:30]}...'")
        return data["id"]
    
    def test_send_empty_message_rejected(self, authenticated_client, test_league_id):
        """POST /api/leagues/{league_id}/messages - Empty message should be rejected"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/leagues/{test_league_id}/messages",
            json={"content": ""}
        )
        
        assert response.status_code == 400, f"Empty message should be rejected, got {response.status_code}"
        print("✅ Empty message correctly rejected")
    
    def test_send_whitespace_message_rejected(self, authenticated_client, test_league_id):
        """POST /api/leagues/{league_id}/messages - Whitespace-only message should be rejected"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/leagues/{test_league_id}/messages",
            json={"content": "   "}
        )
        
        assert response.status_code == 400, f"Whitespace message should be rejected, got {response.status_code}"
        print("✅ Whitespace-only message correctly rejected")
    
    def test_send_long_message_rejected(self, authenticated_client, test_league_id):
        """POST /api/leagues/{league_id}/messages - Message > 500 chars should be rejected"""
        long_message = "A" * 501
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/leagues/{test_league_id}/messages",
            json={"content": long_message}
        )
        
        assert response.status_code == 400, f"Long message should be rejected, got {response.status_code}"
        error = response.json()
        assert "500" in str(error.get("detail", "")), "Error should mention 500 char limit"
        print("✅ Message > 500 chars correctly rejected")
    
    def test_get_league_messages(self, authenticated_client, test_league_id):
        """GET /api/leagues/{league_id}/messages - Get chat messages"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/leagues/{test_league_id}/messages"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        messages = response.json()
        assert isinstance(messages, list), "Should return a list of messages"
        
        if messages:
            msg = messages[0]
            assert "id" in msg, "Message should have id"
            assert "content" in msg, "Message should have content"
            assert "user_id" in msg, "Message should have user_id"
            assert "username" in msg, "Message should have username"
            assert "created_at" in msg, "Message should have created_at"
        
        print(f"✅ Retrieved {len(messages)} chat messages")
    
    def test_get_messages_with_limit(self, authenticated_client, test_league_id):
        """GET /api/leagues/{league_id}/messages?limit=5 - Get limited messages"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/leagues/{test_league_id}/messages?limit=5"
        )
        
        assert response.status_code == 200
        messages = response.json()
        assert len(messages) <= 5, f"Expected max 5 messages, got {len(messages)}"
        print(f"✅ Retrieved {len(messages)} messages with limit=5")
    
    def test_send_message_non_member_rejected(self, api_client):
        """POST /api/leagues/{league_id}/messages - Non-member should be rejected"""
        # Create a new user
        unique_email = f"chattest_{uuid.uuid4().hex[:8]}@test.com"
        register_res = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test12345"
        })
        
        if register_res.status_code != 200:
            pytest.skip("Could not create test user")
        
        new_token = register_res.json()["access_token"]
        
        # Try to send message to a league the user is not part of
        # Using a random non-existent league ID
        response = api_client.post(
            f"{BASE_URL}/api/leagues/{uuid.uuid4()}/messages",
            json={"content": "Test message"},
            headers={"Authorization": f"Bearer {new_token}"}
        )
        
        assert response.status_code == 403, f"Non-member should be rejected, got {response.status_code}"
        print("✅ Non-member message correctly rejected")


class TestLeagueMembers:
    """League Members - GET member list"""
    
    def test_get_league_members(self, authenticated_client, test_league_id, test_user_info):
        """GET /api/leagues/{league_id}/members - Get all league members"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/leagues/{test_league_id}/members"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        members = response.json()
        assert isinstance(members, list), "Should return a list of members"
        assert len(members) > 0, "League should have at least one member"
        
        # Verify member structure
        member = members[0]
        assert "id" in member, "Member should have id"
        assert "username" in member, "Member should have username"
        assert "level" in member, "Member should have level"
        assert "xp" in member, "Member should have xp"
        assert "is_owner" in member, "Member should have is_owner flag"
        
        # Verify current user is in the list
        user_ids = [m["id"] for m in members]
        assert test_user_info["id"] in user_ids, "Current user should be in member list"
        
        print(f"✅ Retrieved {len(members)} league members")
        
        # Check if there's an owner
        owners = [m for m in members if m["is_owner"]]
        assert len(owners) >= 1, "League should have at least one owner"
        print(f"   League owner: {owners[0]['username']}")
    
    def test_get_members_non_member_rejected(self, api_client):
        """GET /api/leagues/{league_id}/members - Non-member should be rejected"""
        # Create a new user
        unique_email = f"membertest_{uuid.uuid4().hex[:8]}@test.com"
        register_res = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test12345"
        })
        
        if register_res.status_code != 200:
            pytest.skip("Could not create test user")
        
        new_token = register_res.json()["access_token"]
        
        # Try to get members of a league the user is not part of
        response = api_client.get(
            f"{BASE_URL}/api/leagues/{uuid.uuid4()}/members",
            headers={"Authorization": f"Bearer {new_token}"}
        )
        
        assert response.status_code == 403, f"Non-member should be rejected, got {response.status_code}"
        print("✅ Non-member members request correctly rejected")


class TestPublicProfile:
    """Public Profile - GET user profile with stats"""
    
    def test_get_own_profile(self, authenticated_client, test_user_info):
        """GET /api/users/{user_id}/profile - Get own public profile"""
        user_id = test_user_info["id"]
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/users/{user_id}/profile"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        profile = response.json()
        
        # Verify basic profile info
        assert "id" in profile, "Profile should have id"
        assert "username" in profile, "Profile should have username"
        assert "level" in profile, "Profile should have level"
        assert "xp" in profile, "Profile should have xp"
        assert "created_at" in profile, "Profile should have created_at"
        
        # Verify stats
        assert "stats" in profile, "Profile should have stats"
        stats = profile["stats"]
        assert "total_predictions" in stats, "Stats should have total_predictions"
        assert "correct_poles" in stats, "Stats should have correct_poles"
        assert "correct_winners" in stats, "Stats should have correct_winners"
        assert "races_participated" in stats, "Stats should have races_participated"
        
        # Verify leagues
        assert "leagues" in profile, "Profile should have leagues"
        assert isinstance(profile["leagues"], list), "Leagues should be a list"
        
        # Verify minigames stats
        assert "minigames" in profile, "Profile should have minigames"
        assert "reaction_best_ms" in profile["minigames"], "Minigames should have reaction_best_ms"
        assert "batak_best_score" in profile["minigames"], "Minigames should have batak_best_score"
        
        print(f"✅ Own profile retrieved: {profile['username']}")
        print(f"   Level: {profile['level']}, XP: {profile['xp']}")
        print(f"   Total predictions: {stats['total_predictions']}")
        print(f"   Leagues in common: {len(profile['leagues'])}")
    
    def test_profile_contains_leagues_in_common(self, authenticated_client, test_user_info):
        """GET /api/users/{user_id}/profile - Should show leagues in common"""
        user_id = test_user_info["id"]
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/users/{user_id}/profile"
        )
        
        assert response.status_code == 200
        profile = response.json()
        
        # When viewing own profile, all leagues should be "in common"
        leagues = profile.get("leagues", [])
        
        if leagues:
            league = leagues[0]
            assert "id" in league, "League should have id"
            assert "name" in league, "League should have name"
            assert "position" in league, "League should have position"
            assert "total_points" in league, "League should have total_points"
            assert "members_count" in league, "League should have members_count"
            print(f"✅ League info: {league['name']}, Position: #{league['position']}, Points: {league['total_points']}")
        else:
            print("⚠️ No common leagues found (expected if user is in leagues)")
    
    def test_profile_contains_recent_predictions(self, authenticated_client, test_user_info):
        """GET /api/users/{user_id}/profile - Should show recent predictions"""
        user_id = test_user_info["id"]
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/users/{user_id}/profile"
        )
        
        assert response.status_code == 200
        profile = response.json()
        
        recent = profile.get("recent_predictions", [])
        
        if recent:
            pred = recent[0]
            assert "race_id" in pred, "Prediction should have race_id"
            assert "race_name" in pred, "Prediction should have race_name"
            assert "quali_pole" in pred, "Prediction should have quali_pole"
            assert "race_winner" in pred, "Prediction should have race_winner"
            print(f"✅ Recent prediction: {pred['race_name']}")
            print(f"   Pole: {pred['quali_pole']}, Winner: {pred['race_winner']}")
        else:
            print("⚠️ No recent predictions found")
    
    def test_get_nonexistent_user_profile(self, authenticated_client):
        """GET /api/users/{user_id}/profile - Non-existent user returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/users/{fake_id}/profile"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Non-existent user correctly returns 404")
    
    def test_profile_excludes_sensitive_data(self, authenticated_client, test_user_info):
        """GET /api/users/{user_id}/profile - Should not expose email or password"""
        user_id = test_user_info["id"]
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/users/{user_id}/profile"
        )
        
        assert response.status_code == 200
        profile = response.json()
        
        assert "email" not in profile, "Profile should NOT expose email"
        assert "password" not in profile, "Profile should NOT expose password"
        assert "password_hash" not in profile, "Profile should NOT expose password_hash"
        
        print("✅ Profile correctly excludes sensitive data (no email/password)")


class TestProfileFromChat:
    """Integration: Navigate from chat member to profile"""
    
    def test_member_to_profile_flow(self, authenticated_client, test_league_id):
        """Integration: Get members list, then fetch profile of a member"""
        # Step 1: Get league members
        members_res = authenticated_client.get(
            f"{BASE_URL}/api/leagues/{test_league_id}/members"
        )
        assert members_res.status_code == 200
        members = members_res.json()
        
        if not members:
            pytest.skip("No members in league")
        
        # Step 2: Get profile of first member
        member = members[0]
        profile_res = authenticated_client.get(
            f"{BASE_URL}/api/users/{member['id']}/profile"
        )
        
        assert profile_res.status_code == 200
        profile = profile_res.json()
        
        # Verify profile matches member info
        assert profile["id"] == member["id"], "Profile ID should match member ID"
        assert profile["username"] == member["username"], "Username should match"
        assert profile["level"] == member["level"], "Level should match"
        
        print(f"✅ Integration: Members → Profile flow works")
        print(f"   Member: {member['username']} → Profile with {len(profile.get('leagues', []))} common leagues")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
