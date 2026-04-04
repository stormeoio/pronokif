"""
PRONOKIF - Refactored Server Entry Point
This is a template for the fully refactored version.
Currently, the original server.py is still in use.

To complete the migration:
1. Test each route module individually
2. Replace imports in server.py progressively
3. Finally switch to this new structure

Structure:
/app/backend/
├── server.py           # This file - Main entry point
├── config.py           # Database and configuration ✓
├── models/
│   └── schemas.py      # Pydantic models ✓
├── routes/
│   ├── auth.py         # Authentication routes ✓
│   ├── leagues.py      # League management (TODO)
│   ├── predictions.py  # Predictions (TODO)
│   ├── races.py        # Races and drivers (TODO)
│   ├── admin.py        # Admin endpoints (TODO)
│   ├── minigames.py    # Mini-games (TODO)
│   └── user.py         # User profile (TODO)
├── services/
│   ├── auth.py         # Auth utilities ✓
│   ├── scoring.py      # Points calculation ✓
│   └── sync.py         # Auto-sync service (TODO)
└── data/
    └── f1_data.py      # F1 static data ✓
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Import routers
from routes.auth import router as auth_router
# from routes.leagues import router as leagues_router  # TODO
# from routes.predictions import router as predictions_router  # TODO
# from routes.races import router as races_router  # TODO
# from routes.admin import router as admin_router  # TODO
# from routes.minigames import router as minigames_router  # TODO
# from routes.user import router as user_router  # TODO

app = FastAPI(title="PRONOKIF API")

# Include routers
app.include_router(auth_router, prefix="/api")
# app.include_router(leagues_router, prefix="/api")  # TODO
# app.include_router(predictions_router, prefix="/api")  # TODO
# app.include_router(races_router, prefix="/api")  # TODO
# app.include_router(admin_router, prefix="/api")  # TODO
# app.include_router(minigames_router, prefix="/api")  # TODO
# app.include_router(user_router, prefix="/api")  # TODO

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "refactored"}
