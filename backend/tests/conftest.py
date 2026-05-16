"""
Integration test fixtures for the Pronokif backend.

These tests require a running server. Start it with:
    uvicorn server:app --reload

Override the base URL with the TEST_API_URL environment variable:
    TEST_API_URL=http://localhost:8000 pytest tests/
"""
import os

import pytest
import requests


@pytest.fixture(scope="session")
def base_url() -> str:
    """Base URL of the running Pronokif API server."""
    return os.environ.get("TEST_API_URL", "http://localhost:8000")


@pytest.fixture(scope="session")
def api_session(base_url: str) -> requests.Session:
    """Requests session pre-configured with the API base URL."""
    session = requests.Session()
    session.base_url = base_url  # type: ignore[attr-defined]
    return session
