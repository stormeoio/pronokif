"""
Test suite for Driver Details API endpoint
Testing GET /api/drivers/{driver_id}/details
"""

import os

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestDriverDetailsAPI:
    """Tests for the /api/drivers/{driver_id}/details endpoint"""

    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")

    def test_get_hamilton_details(self):
        """Test getting Lewis Hamilton's details"""
        response = requests.get(f"{BASE_URL}/api/drivers/hamilton/details")
        assert response.status_code == 200

        data = response.json()
        # Verify basic info
        assert data["id"] == "hamilton"
        assert data["first_name"] == "Lewis"
        assert data["last_name"] == "Hamilton"
        assert data["team"] == "Ferrari"
        assert data["number"] == 44
        assert data["country"] == "GBR"

        # Verify photo URL is present
        assert "photo_url" in data
        assert data["photo_url"].startswith("https://media.formula1.com")

        # Verify palmares structure
        assert "palmares" in data
        assert "f1" in data["palmares"]
        f1_stats = data["palmares"]["f1"]
        assert f1_stats["world_championships"] == 7
        assert f1_stats["wins"] > 100

        # Verify useful_facts - should have exactly 10
        assert "useful_facts" in data
        assert len(data["useful_facts"]) == 10

        # Verify contract info
        assert "contract" in data
        assert data["contract"]["end_year"] == 2027

        print(f"✓ Hamilton details: {data['full_name']}, {data['team']}, {len(data['useful_facts'])} facts")

    def test_get_verstappen_details(self):
        """Test getting Max Verstappen's details"""
        response = requests.get(f"{BASE_URL}/api/drivers/verstappen/details")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == "verstappen"
        assert data["team"] == "Red Bull Racing"
        assert data["palmares"]["f1"]["world_championships"] == 4
        assert len(data["useful_facts"]) == 10

        print(f"✓ Verstappen details: {data['palmares']['f1']['wins']} wins, {data['palmares']['f1']['poles']} poles")

    def test_get_norris_details(self):
        """Test getting Lando Norris details - 2025 World Champion"""
        response = requests.get(f"{BASE_URL}/api/drivers/norris/details")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == "norris"
        assert data["team"] == "McLaren"
        assert data["number"] == 1  # World champion number
        assert data["palmares"]["f1"]["world_championships"] == 1

        # Verify junior career
        assert "junior" in data["palmares"]
        assert len(data["palmares"]["junior"]) > 0

        print(f"✓ Norris details: World Champ #{data['number']}, Contract until {data['contract']['end_year']}")

    def test_get_antonelli_details(self):
        """Test getting Kimi Antonelli - rookie driver"""
        response = requests.get(f"{BASE_URL}/api/drivers/antonelli/details")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == "antonelli"
        assert data["team"] == "Mercedes"
        assert data["first_name"] == "Kimi"

        # Verify personal info
        assert data["country"] == "ITA"
        assert "date_of_birth" in data

        print(f"✓ Antonelli details: {data['full_name']}, born {data['date_of_birth']}")

    def test_get_invalid_driver_returns_404(self):
        """Test that invalid driver ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/drivers/invalid_driver_xyz/details")
        assert response.status_code == 404

        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Pilote introuvable"

        print("✓ Invalid driver correctly returns 404")

    def test_driver_photo_url_format(self):
        """Test that driver photo URLs are valid F1 media URLs"""
        drivers_to_test = ["leclerc", "sainz", "alonso", "gasly"]

        for driver_id in drivers_to_test:
            response = requests.get(f"{BASE_URL}/api/drivers/{driver_id}/details")
            assert response.status_code == 200

            data = response.json()
            assert "photo_url" in data
            assert data["photo_url"].startswith("https://media.formula1.com")

            print(f"✓ {driver_id} photo URL valid")

    def test_driver_facts_structure(self):
        """Test that useful_facts have correct structure"""
        response = requests.get(f"{BASE_URL}/api/drivers/leclerc/details")
        assert response.status_code == 200

        data = response.json()
        facts = data["useful_facts"]

        assert len(facts) == 10

        for fact in facts:
            assert "type" in fact
            assert "title" in fact
            assert "text" in fact
            assert "icon" in fact

        print(f"✓ Leclerc: {len(facts)} facts with proper structure")

    def test_driver_palmares_structure(self):
        """Test palmares contains F1 stats and junior career"""
        response = requests.get(f"{BASE_URL}/api/drivers/piastri/details")
        assert response.status_code == 200

        data = response.json()
        palmares = data["palmares"]

        # F1 stats
        assert "f1" in palmares
        f1 = palmares["f1"]
        assert "seasons" in f1
        assert "first_team" in f1
        assert "world_championships" in f1
        assert "wins" in f1
        assert "podiums" in f1
        assert "poles" in f1
        assert "fastest_laps" in f1
        assert "points" in f1
        assert "entries" in f1

        # Junior career
        assert "junior" in palmares
        assert len(palmares["junior"]) > 0

        junior_season = palmares["junior"][0]
        assert "year" in junior_season
        assert "series" in junior_season
        assert "team" in junior_season
        assert "position" in junior_season

        print(f"✓ Piastri palmares: F1 {f1['wins']} wins, {len(palmares['junior'])} junior seasons")

    def test_driver_contract_info(self):
        """Test contract information is present"""
        response = requests.get(f"{BASE_URL}/api/drivers/alonso/details")
        assert response.status_code == 200

        data = response.json()
        contract = data["contract"]

        assert "start_year" in contract
        assert "end_year" in contract
        assert "salary_estimate" in contract

        print(f"✓ Alonso contract: {contract['start_year']}-{contract['end_year']}, {contract['salary_estimate']}")

    def test_all_22_drivers_accessible(self):
        """Test all 22 drivers in the grid return valid data"""
        driver_ids = [
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
            "perez",
            "bottas",
        ]

        success_count = 0
        for driver_id in driver_ids:
            response = requests.get(f"{BASE_URL}/api/drivers/{driver_id}/details")
            if response.status_code == 200:
                data = response.json()
                assert data["id"] == driver_id
                assert "photo_url" in data
                assert len(data.get("useful_facts", [])) == 10
                success_count += 1

        assert success_count == 22, f"Only {success_count}/22 drivers returned successfully"
        print(f"✓ All {success_count} drivers accessible with valid data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
