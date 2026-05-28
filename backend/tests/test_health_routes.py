from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.health import root_router
from routes.health import router as health_router


def test_root_endpoint_points_to_api_health_and_docs():
    app = FastAPI()
    app.include_router(root_router)
    app.include_router(health_router, prefix="/api")

    response = TestClient(app).get("/")

    assert response.status_code == 200
    assert response.json() == {
        "service": "pronokif-api",
        "status": "ok",
        "health": "/api/health",
        "docs": "/docs",
    }


def test_health_endpoint_stays_under_api_prefix():
    app = FastAPI()
    app.include_router(health_router, prefix="/api")

    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
