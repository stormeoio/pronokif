from fastapi import FastAPI
from fastapi.testclient import TestClient

from middleware.security import install_cors


def test_dev_cors_allows_127_localhost_origin(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")

    app = FastAPI()
    install_cors(app)

    client = TestClient(app)
    response = client.options(
        "/api/admin-bo/auth/magic-link",
        headers={
            "Origin": "http://127.0.0.1:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"


def test_dev_cors_adds_127_alias_when_env_lists_localhost(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv("ENVIRONMENT", "development")

    app = FastAPI()
    install_cors(app)

    client = TestClient(app)
    response = client.options(
        "/api/admin-bo/auth/magic-link",
        headers={
            "Origin": "http://127.0.0.1:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"


def test_dev_cors_allows_loopback_alternate_vite_port(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv("ENVIRONMENT", "development")

    app = FastAPI()
    install_cors(app)

    client = TestClient(app)
    response = client.options(
        "/api/auth/register",
        headers={
            "Origin": "http://127.0.0.1:3001",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3001"
