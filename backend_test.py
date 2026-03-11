import requests
import sys
import json
import uuid
from datetime import datetime

class F1PredictorAPITester:
    def __init__(self, base_url="https://podium-clash.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        self.test_password = "TestPass123!"
        self.test_username = f"TestUser{uuid.uuid4().hex[:6]}"
        self.test_league_name = f"Test League {uuid.uuid4().hex[:6]}"
        self.league_id = None
        self.league_code = None

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}: {message}")

    def make_request(self, method, endpoint, data=None, expect_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expect_status
            return success, response
        except Exception as e:
            return False, str(e)

    def test_health_check(self):
        """Test API health endpoint"""
        success, response = self.make_request('GET', 'health')
        if success:
            self.log_result("Health Check", True, f"API is healthy - Status: {response.status_code}")
            return True
        else:
            self.log_result("Health Check", False, f"API health check failed - {response}")
            return False

    def test_get_drivers(self):
        """Test get drivers endpoint"""
        success, response = self.make_request('GET', 'drivers')
        if success:
            drivers = response.json()
            self.log_result("Get Drivers", True, f"Retrieved {len(drivers)} drivers")
            return True
        else:
            self.log_result("Get Drivers", False, f"Failed to get drivers - Status: {response.status_code}")
            return False

    def test_get_races(self):
        """Test get races endpoint"""
        success, response = self.make_request('GET', 'races')
        if success:
            races = response.json()
            self.log_result("Get Races", True, f"Retrieved {len(races)} races")
            return True
        else:
            self.log_result("Get Races", False, f"Failed to get races - Status: {response.status_code}")
            return False

    def test_get_next_race(self):
        """Test get next race endpoint"""
        success, response = self.make_request('GET', 'races/next')
        if success:
            race = response.json()
            self.log_result("Get Next Race", True, f"Next race: {race.get('name', 'Unknown')}")
            return True
        else:
            self.log_result("Get Next Race", False, f"Failed to get next race - Status: {response.status_code}")
            return False

    def test_register(self):
        """Test user registration"""
        data = {
            "email": self.test_email,
            "password": self.test_password
        }
        success, response = self.make_request('POST', 'auth/register', data, 200)
        
        if success:
            response_data = response.json()
            self.token = response_data.get('access_token')
            self.user_id = response_data.get('user', {}).get('id')
            self.log_result("User Registration", True, f"User registered successfully - ID: {self.user_id}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if hasattr(response, 'json') else str(response)
            self.log_result("User Registration", False, f"Registration failed - {error_msg}")
            return False

    def test_set_username(self):
        """Test setting username"""
        if not self.token:
            self.log_result("Set Username", False, "No auth token available")
            return False
            
        data = {"username": self.test_username}
        success, response = self.make_request('POST', 'auth/username', data)
        
        if success:
            self.log_result("Set Username", True, f"Username set to: {self.test_username}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if hasattr(response, 'json') else str(response)
            self.log_result("Set Username", False, f"Failed to set username - {error_msg}")
            return False

    def test_get_me(self):
        """Test get current user endpoint"""
        if not self.token:
            self.log_result("Get Me", False, "No auth token available")
            return False
            
        success, response = self.make_request('GET', 'auth/me')
        
        if success:
            user_data = response.json()
            self.log_result("Get Me", True, f"Retrieved user data for: {user_data.get('username', 'No username')}")
            return True
        else:
            self.log_result("Get Me", False, f"Failed to get user data - Status: {response.status_code}")
            return False

    def test_create_league(self):
        """Test creating a league"""
        if not self.token:
            self.log_result("Create League", False, "No auth token available")
            return False
            
        data = {"name": self.test_league_name}
        success, response = self.make_request('POST', 'leagues', data)
        
        if success:
            league_data = response.json()
            self.league_id = league_data.get('id')
            self.league_code = league_data.get('code')
            self.log_result("Create League", True, f"League created - Code: {self.league_code}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if hasattr(response, 'json') else str(response)
            self.log_result("Create League", False, f"Failed to create league - {error_msg}")
            return False

    def test_get_my_leagues(self):
        """Test getting user's leagues"""
        if not self.token:
            self.log_result("Get My Leagues", False, "No auth token available")
            return False
            
        success, response = self.make_request('GET', 'leagues/my')
        
        if success:
            leagues = response.json()
            self.log_result("Get My Leagues", True, f"Retrieved {len(leagues)} leagues")
            return True
        else:
            self.log_result("Get My Leagues", False, f"Failed to get leagues - Status: {response.status_code}")
            return False

    def test_get_leaderboard(self):
        """Test getting league leaderboard"""
        if not self.token or not self.league_id:
            self.log_result("Get Leaderboard", False, "No auth token or league ID available")
            return False
            
        success, response = self.make_request('GET', f'leagues/{self.league_id}/leaderboard')
        
        if success:
            leaderboard = response.json()
            self.log_result("Get Leaderboard", True, f"Retrieved leaderboard with {len(leaderboard)} entries")
            return True
        else:
            self.log_result("Get Leaderboard", False, f"Failed to get leaderboard - Status: {response.status_code}")
            return False

    def test_create_prediction(self):
        """Test creating a prediction"""
        if not self.token:
            self.log_result("Create Prediction", False, "No auth token available")
            return False
            
        # Get next race first
        success, race_response = self.make_request('GET', 'races/next')
        if not success:
            self.log_result("Create Prediction", False, "Could not get next race")
            return False
            
        race = race_response.json()
        race_id = race.get('id')
        
        # Get drivers for prediction
        success, drivers_response = self.make_request('GET', 'drivers')
        if not success:
            self.log_result("Create Prediction", False, "Could not get drivers")
            return False
            
        drivers = drivers_response.json()
        if len(drivers) < 6:
            self.log_result("Create Prediction", False, "Not enough drivers for prediction")
            return False
            
        # Create prediction with first 6 drivers
        driver_ids = [driver['id'] for driver in drivers[:6]]
        
        data = {
            "race_id": race_id,
            "quali_pole": driver_ids[0],
            "quali_top3": driver_ids[:3],
            "race_winner": driver_ids[1],
            "race_top3": driver_ids[1:4]
        }
        
        success, response = self.make_request('POST', 'predictions', data)
        
        if success:
            prediction = response.json()
            self.log_result("Create Prediction", True, f"Prediction created for race: {race.get('name')}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if hasattr(response, 'json') else str(response)
            self.log_result("Create Prediction", False, f"Failed to create prediction - {error_msg}")
            return False

    def test_get_prediction_history(self):
        """Test getting prediction history"""
        if not self.token:
            self.log_result("Get Prediction History", False, "No auth token available")
            return False
            
        success, response = self.make_request('GET', 'predictions/history')
        
        if success:
            history = response.json()
            self.log_result("Get Prediction History", True, f"Retrieved {len(history)} predictions from history")
            return True
        else:
            self.log_result("Get Prediction History", False, f"Failed to get prediction history - Status: {response.status_code}")
            return False

    def test_login(self):
        """Test user login with existing credentials"""
        # Clear current token to test login
        temp_token = self.token
        self.token = None
        
        data = {
            "email": self.test_email,
            "password": self.test_password
        }
        success, response = self.make_request('POST', 'auth/login', data)
        
        if success:
            response_data = response.json()
            self.token = response_data.get('access_token')
            self.log_result("User Login", True, f"Login successful")
            return True
        else:
            self.token = temp_token  # Restore token on failure
            error_msg = response.json().get('detail', 'Unknown error') if hasattr(response, 'json') else str(response)
            self.log_result("User Login", False, f"Login failed - {error_msg}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting F1 Paddock Predictor API Tests")
        print(f"📡 Backend URL: {self.base_url}")
        print(f"📧 Test Email: {self.test_email}")
        print("=" * 60)
        
        # Basic API tests (no auth required)
        self.test_health_check()
        self.test_get_drivers()
        self.test_get_races()
        self.test_get_next_race()
        
        # Auth flow tests
        if self.test_register():
            self.test_set_username()
            self.test_get_me()
            
            # League tests
            if self.test_create_league():
                self.test_get_my_leagues()
                self.test_get_leaderboard()
            
            # Prediction tests
            self.test_create_prediction()
            self.test_get_prediction_history()
            
            # Login test
            self.test_login()
        
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"🎯 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['message']}")
        
        return self.tests_passed, self.tests_run, self.test_results

def main():
    tester = F1PredictorAPITester()
    passed, total, results = tester.run_all_tests()
    
    # Return exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())