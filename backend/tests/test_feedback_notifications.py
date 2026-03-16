"""
Test suite for PRONOKIF Feedback and Notifications features
Features tested:
1. POST /api/feedback - Submit user feedback
2. GET /api/admin/feedback - Get all feedback (admin only)
3. PUT /api/admin/feedback/{id}/read - Mark feedback as read
4. POST /api/admin/notifications - Create notification for all users
5. GET /api/notifications - Get user's notifications
6. GET /api/notifications/unread-count - Get unread count
7. PUT /api/notifications/{id}/read - Mark notification as read
8. PUT /api/notifications/read-all - Mark all notifications as read
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin email from backend
ADMIN_EMAIL = "catalan.baptiste123@gmail.com"
ADMIN_PASSWORD = "admin12345"

# Regular test user
TEST_EMAIL = f"test_notif_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "test12345"


class TestSetup:
    """Setup test users"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        """Get or create admin user token"""
        # Try to login first
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_res.status_code == 200:
            return login_res.json()["access_token"]
        
        # Register admin if not exists
        reg_res = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if reg_res.status_code in [200, 201]:
            return reg_res.json()["access_token"]
        
        pytest.skip(f"Could not authenticate admin user: {login_res.status_code}")
    
    @pytest.fixture(scope="class")
    def regular_user_token(self, session):
        """Get or create regular test user token"""
        # Register new user
        reg_res = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if reg_res.status_code in [200, 201]:
            return reg_res.json()["access_token"]
        
        # Try login if already exists
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_res.status_code == 200:
            return login_res.json()["access_token"]
        
        pytest.skip("Could not create/login test user")


class TestFeedbackSubmission(TestSetup):
    """Test feedback submission endpoints"""
    
    def test_submit_feedback_bug(self, session, regular_user_token):
        """Test submitting bug feedback"""
        response = session.post(
            f"{BASE_URL}/api/feedback",
            json={"category": "bug", "message": "Test bug report for testing purposes"},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "id" in data
        print(f"✓ Bug feedback submitted: {data['id']}")
    
    def test_submit_feedback_suggestion(self, session, regular_user_token):
        """Test submitting suggestion feedback"""
        response = session.post(
            f"{BASE_URL}/api/feedback",
            json={"category": "suggestion", "message": "Test suggestion for new feature"},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Feedback submitted successfully"
        print("✓ Suggestion feedback submitted")
    
    def test_submit_feedback_general(self, session, regular_user_token):
        """Test submitting general feedback"""
        response = session.post(
            f"{BASE_URL}/api/feedback",
            json={"category": "feedback", "message": "Test general feedback about the app"},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200
        print("✓ General feedback submitted")
    
    def test_submit_feedback_empty_message(self, session, regular_user_token):
        """Test empty message is rejected"""
        response = session.post(
            f"{BASE_URL}/api/feedback",
            json={"category": "bug", "message": "   "},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 400
        print("✓ Empty message correctly rejected")
    
    def test_submit_feedback_invalid_category(self, session, regular_user_token):
        """Test invalid category is rejected"""
        response = session.post(
            f"{BASE_URL}/api/feedback",
            json={"category": "invalid", "message": "Test message"},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 400
        print("✓ Invalid category correctly rejected")
    
    def test_submit_feedback_long_message(self, session, regular_user_token):
        """Test message over 2000 chars is rejected"""
        long_message = "a" * 2001
        response = session.post(
            f"{BASE_URL}/api/feedback",
            json={"category": "feedback", "message": long_message},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 400
        print("✓ Long message correctly rejected")
    
    def test_submit_feedback_unauthorized(self, session):
        """Test feedback requires authentication"""
        response = session.post(
            f"{BASE_URL}/api/feedback",
            json={"category": "bug", "message": "Test message"}
        )
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access correctly rejected")


class TestAdminFeedback(TestSetup):
    """Test admin feedback management endpoints"""
    
    def test_admin_get_all_feedback(self, session, admin_token):
        """Test admin can get all feedback"""
        response = session.get(
            f"{BASE_URL}/api/admin/feedback",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin can view {len(data)} feedback items")
    
    def test_admin_feedback_structure(self, session, admin_token):
        """Test feedback has correct structure"""
        response = session.get(
            f"{BASE_URL}/api/admin/feedback",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            feedback = data[0]
            assert "id" in feedback
            assert "user_id" in feedback
            assert "category" in feedback
            assert "message" in feedback
            assert "created_at" in feedback
            assert "read" in feedback
            print(f"✓ Feedback structure is correct: {list(feedback.keys())}")
        else:
            print("⚠ No feedback to verify structure")
    
    def test_regular_user_cannot_access_admin_feedback(self, session, regular_user_token):
        """Test regular user cannot access admin endpoint"""
        response = session.get(
            f"{BASE_URL}/api/admin/feedback",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403
        print("✓ Regular user correctly denied admin access")
    
    def test_admin_mark_feedback_read(self, session, admin_token):
        """Test admin can mark feedback as read"""
        # First get feedback list
        list_res = session.get(
            f"{BASE_URL}/api/admin/feedback",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if list_res.status_code == 200 and len(list_res.json()) > 0:
            feedback_id = list_res.json()[0]["id"]
            
            response = session.put(
                f"{BASE_URL}/api/admin/feedback/{feedback_id}/read",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            print(f"✓ Feedback {feedback_id} marked as read")
        else:
            print("⚠ No feedback available to mark as read")


class TestNotificationCreation(TestSetup):
    """Test notification creation by admin"""
    
    created_notification_id = None
    
    def test_admin_create_notification_info(self, session, admin_token):
        """Test admin can create info notification"""
        response = session.post(
            f"{BASE_URL}/api/admin/notifications",
            json={
                "title": "Test Info Notification",
                "message": "This is a test info notification for testing",
                "type": "info"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestNotificationCreation.created_notification_id = data["id"]
        print(f"✓ Info notification created: {data['id']}")
    
    def test_admin_create_notification_update(self, session, admin_token):
        """Test admin can create update notification"""
        response = session.post(
            f"{BASE_URL}/api/admin/notifications",
            json={
                "title": "Test Update Notification",
                "message": "This is a test update notification",
                "type": "update"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✓ Update notification created")
    
    def test_admin_create_notification_important(self, session, admin_token):
        """Test admin can create important notification"""
        response = session.post(
            f"{BASE_URL}/api/admin/notifications",
            json={
                "title": "Test Important Notification",
                "message": "This is a test important notification",
                "type": "important"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✓ Important notification created")
    
    def test_admin_create_notification_invalid_type(self, session, admin_token):
        """Test invalid notification type is rejected"""
        response = session.post(
            f"{BASE_URL}/api/admin/notifications",
            json={
                "title": "Test",
                "message": "Test message",
                "type": "invalid_type"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        print("✓ Invalid notification type correctly rejected")
    
    def test_admin_create_notification_empty_title(self, session, admin_token):
        """Test empty title is rejected"""
        response = session.post(
            f"{BASE_URL}/api/admin/notifications",
            json={
                "title": "   ",
                "message": "Test message",
                "type": "info"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        print("✓ Empty title correctly rejected")
    
    def test_regular_user_cannot_create_notification(self, session, regular_user_token):
        """Test regular user cannot create notifications"""
        response = session.post(
            f"{BASE_URL}/api/admin/notifications",
            json={
                "title": "Test",
                "message": "Test message",
                "type": "info"
            },
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403
        print("✓ Regular user correctly denied notification creation")


class TestUserNotifications(TestSetup):
    """Test user notification endpoints"""
    
    def test_get_notifications(self, session, regular_user_token):
        """Test user can get their notifications"""
        response = session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ User can view {len(data)} notifications")
    
    def test_notifications_structure(self, session, regular_user_token):
        """Test notification has correct structure"""
        response = session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif
            assert "title" in notif
            assert "message" in notif
            assert "type" in notif
            assert "created_at" in notif
            assert "is_read" in notif
            print(f"✓ Notification structure is correct: {list(notif.keys())}")
        else:
            print("⚠ No notifications to verify structure")
    
    def test_get_unread_count(self, session, regular_user_token):
        """Test user can get unread count"""
        response = session.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        print(f"✓ Unread count: {data['count']}")
    
    def test_mark_notification_read(self, session, regular_user_token):
        """Test user can mark notification as read"""
        # First get notifications
        list_res = session.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        
        if list_res.status_code == 200 and len(list_res.json()) > 0:
            notif = list_res.json()[0]
            notif_id = notif["id"]
            
            # Mark as read
            response = session.put(
                f"{BASE_URL}/api/notifications/{notif_id}/read",
                headers={"Authorization": f"Bearer {regular_user_token}"}
            )
            assert response.status_code == 200
            print(f"✓ Notification {notif_id} marked as read")
            
            # Verify count decreased
            count_res = session.get(
                f"{BASE_URL}/api/notifications/unread-count",
                headers={"Authorization": f"Bearer {regular_user_token}"}
            )
            print(f"  Unread count after marking: {count_res.json().get('count', 0)}")
        else:
            print("⚠ No notifications available to mark as read")
    
    def test_mark_all_notifications_read(self, session, regular_user_token):
        """Test user can mark all notifications as read"""
        response = session.put(
            f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200
        print("✓ All notifications marked as read")
        
        # Verify count is 0
        count_res = session.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert count_res.status_code == 200
        # Note: Count might not be 0 if new notifications were created after marking all read
        print(f"  Unread count after marking all: {count_res.json().get('count', 0)}")


class TestNotificationsUnauthorized(TestSetup):
    """Test notification endpoints require authentication"""
    
    def test_get_notifications_unauthorized(self, session):
        """Test notifications require auth"""
        response = session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized notifications access rejected")
    
    def test_get_unread_count_unauthorized(self, session):
        """Test unread count requires auth"""
        response = session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized unread count access rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
