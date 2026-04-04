# PRONOKIF Backend Refactoring Guide

## Current Status

The backend refactoring has been **significantly completed (Phase 2)**. Most route modules have been extracted.

### ✅ Completed Modules

#### Configuration & Models
1. **config.py** - Database connection, JWT settings, scoring rules, API URLs
2. **models/schemas.py** - All Pydantic models (Auth, League, Prediction, Race, Admin)
3. **data/f1_data.py** - F1_DRIVERS_2026, F1_CIRCUITS, F1_RACES_2026

#### Services
4. **services/auth.py** - Auth utilities (hash_password, verify_password, create_token, get_current_user, etc.)
5. **services/scoring.py** - calculate_points()

#### Routes (Extracted - Ready for integration)
6. **routes/auth.py** - /auth/* endpoints
7. **routes/leagues.py** - /leagues/* endpoints (CRUD, chat, members)
8. **routes/predictions.py** - /predictions/* endpoints (main, sprint, custom)
9. **routes/races.py** - /races/*, /drivers/* endpoints
10. **routes/minigames.py** - /minigames/* endpoints

### 🔄 Remaining Modules (Still in server.py)

1. **routes/admin.py** (~800 lines)
   - Results management & sync
   - Member administration
   - Feedback management

2. **routes/user.py** (~400 lines)
   - Profile management
   - Avatars
   - Missions and stats

3. **services/sync.py**
   - sync_race_from_api()
   - Auto-sync scheduler

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
