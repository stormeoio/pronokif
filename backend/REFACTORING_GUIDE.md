# PRONOKIF Backend Refactoring Guide

## Current Status

The backend refactoring has been **partially completed**. The following modules have been extracted and are ready for use:

### ✅ Completed Modules

1. **config.py** - Database connection and configuration
   - MongoDB connection
   - JWT settings
   - Scoring rules
   - API URLs

2. **models/schemas.py** - All Pydantic models
   - Auth models (UserCreate, UserLogin, TokenResponse, etc.)
   - League models (LeagueCreate, LeagueResponse, etc.)
   - Prediction models (PredictionCreate, BonusBets, etc.)
   - Race and Driver models
   - Admin models

3. **data/f1_data.py** - Static F1 data
   - F1_DRIVERS_2026
   - F1_CIRCUITS
   - F1_RACES_2026

4. **services/auth.py** - Authentication utilities
   - hash_password()
   - verify_password()
   - create_token()
   - get_current_user()
   - generate_league_code()
   - send_user_notification()
   - check_is_admin()

5. **services/scoring.py** - Points calculation
   - calculate_points()

6. **routes/auth.py** - Authentication endpoints
   - POST /auth/register
   - POST /auth/login
   - GET /auth/me
   - POST /auth/username

### 🔄 Pending Modules (Still in server.py)

The following modules need to be extracted from `server.py`:

1. **routes/leagues.py** (~500 lines)
   - League CRUD operations
   - Chat functionality
   - Member management

2. **routes/predictions.py** (~500 lines)
   - Prediction creation/update
   - Custom predictions
   - Sprint/Main race predictions

3. **routes/races.py** (~600 lines)
   - Race listing and details
   - Driver information
   - Results display

4. **routes/admin.py** (~800 lines)
   - Results management
   - Sync functionality
   - Member administration
   - Feedback management

5. **routes/minigames.py** (~400 lines)
   - Reaction time game
   - Batak game
   - Leaderboards

6. **routes/user.py** (~400 lines)
   - Profile management
   - Avatars
   - Missions and stats

7. **services/sync.py**
   - sync_race_from_api()
   - Auto-sync scheduler
   - OpenF1 integration

## How to Complete the Migration

### Step 1: Extract routes one by one

```python
# In routes/leagues.py
from fastapi import APIRouter, Depends, HTTPException
from config import db
from models.schemas import LeagueCreate, LeagueResponse
from services.auth import get_current_user, generate_league_code

router = APIRouter(prefix="/leagues", tags=["Leagues"])

@router.post("", response_model=LeagueResponse)
async def create_league(data: LeagueCreate, user=Depends(get_current_user)):
    # ... copy code from server.py
```

### Step 2: Update server.py to use routers

```python
# In server.py, replace direct route definitions with:
from routes.auth import router as auth_router
from routes.leagues import router as leagues_router

app.include_router(auth_router, prefix="/api")
app.include_router(leagues_router, prefix="/api")
```

### Step 3: Test each module

```bash
# Test after each change
curl -X POST https://podium-clash.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

## File Structure After Complete Migration

```
/app/backend/
├── server.py           # Entry point (~100 lines)
├── config.py           # Configuration
├── features.py         # Existing features module
├── drivers_data.py     # Extended driver data
├── models/
│   ├── __init__.py
│   └── schemas.py
├── routes/
│   ├── __init__.py
│   ├── auth.py
│   ├── leagues.py
│   ├── predictions.py
│   ├── races.py
│   ├── admin.py
│   ├── minigames.py
│   └── user.py
├── services/
│   ├── __init__.py
│   ├── auth.py
│   ├── scoring.py
│   └── sync.py
└── data/
    ├── __init__.py
    └── f1_data.py
```

## Benefits After Migration

1. **Maintainability**: Each module is focused and easy to understand
2. **Testing**: Unit tests can target specific modules
3. **Hot Reload**: Faster reloads as only changed modules are recompiled
4. **Collaboration**: Multiple developers can work on different modules
5. **Code Organization**: Clear separation of concerns

## Risks and Mitigation

1. **Risk**: Breaking existing functionality
   - **Mitigation**: Test each route after extraction
   
2. **Risk**: Import errors and circular dependencies
   - **Mitigation**: Use config.py as single source for shared resources
   
3. **Risk**: Missing middleware or global handlers
   - **Mitigation**: Keep CORS and error handling in main server.py

## Estimated Effort

- Routes extraction: ~2-3 hours
- Services extraction: ~1 hour
- Testing and validation: ~1 hour
- Total: ~4-5 hours of focused work
