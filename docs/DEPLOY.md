# Pronokif — Guide de deploiement

## Architecture cible

```
                    ┌─────────────┐
                    │  Cloudflare │
                    │  DNS + WAF  │
                    │  CDN (R2)   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐     ┌──────────▼──────────┐
     │  Frontend (Nginx)│     │  Backend (FastAPI)  │
     │  DigitalOcean    │     │  DigitalOcean       │
     │  App Platform    │     │  App Platform       │
     └─────────────────┘     └──────────┬──────────┘
                                        │
                              ┌─────────▼─────────┐
                              │  MongoDB Atlas     │
                              │  M0 (staging)      │
                              │  M10 (production)  │
                              └───────────────────┘
```

## Prerequis

- Compte DigitalOcean (App Platform)
- Compte MongoDB Atlas
- Compte Cloudflare (DNS)
- Compte Sentry (monitoring)
- Compte GitHub (CI/CD via Actions)

## 1. MongoDB Atlas

### Staging (M0 free tier)
1. Creer un cluster M0 dans la region `EU-West-1` (Paris)
2. Creer un utilisateur DB `pronokif-staging` avec mot de passe fort
3. Whitelister les IPs DigitalOcean (ou `0.0.0.0/0` pour le free tier)
4. Connection string : `mongodb+srv://pronokif-staging:<password>@cluster0.xxxxx.mongodb.net/pronokif_staging`

### Production (M10)
1. Cluster M10 dedie, meme region
2. Activer backup automatique (daily)
3. Connection string : `mongodb+srv://pronokif-prod:<password>@prod.xxxxx.mongodb.net/pronokif`

## 2. DigitalOcean App Platform

### Backend
```yaml
# .do/app.yaml (backend)
name: pronokif-backend
services:
  - name: api
    source_dir: /backend
    dockerfile_path: backend/Dockerfile
    http_port: 8000
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: MONGO_URL
        value: ${MONGO_URL}
        type: SECRET
      - key: DB_NAME
        value: pronokif
      - key: JWT_SECRET
        value: ${JWT_SECRET}
        type: SECRET
      - key: CORS_ORIGINS
        value: https://pronokif.com
    health_check:
      http_path: /docs
```

### Frontend
```yaml
# .do/app.yaml (frontend)
name: pronokif-frontend
static_sites:
  - name: web
    source_dir: /frontend
    build_command: npm ci --legacy-peer-deps && npm run build
    output_dir: build
    envs:
      - key: VITE_BACKEND_URL
        value: https://api.pronokif.com
```

### Deploy
```bash
# Depuis la racine du repo
doctl apps create --spec .do/app.yaml
```

## 3. Cloudflare

1. Ajouter le domaine `pronokif.com`
2. Configurer les records DNS :
   - `A pronokif.com` → IP DigitalOcean frontend
   - `A api.pronokif.com` → IP DigitalOcean backend
3. Activer :
   - SSL/TLS : Full (strict)
   - WAF : OWASP managed rules
   - Cache : standard (pas de cache sur `/api/*`)
4. Page rule : `api.pronokif.com/*` → Cache Level: Bypass

## 4. Sentry

### Backend (Python)
```bash
pip install sentry-sdk[fastapi]
```

```python
# config.py
import sentry_sdk

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    traces_sample_rate=0.1,
    environment=os.environ.get("ENV", "development"),
)
```

### Frontend (React)
```bash
npm install @sentry/react
```

```typescript
// main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: import.meta.env.MODE,
});
```

## 5. Monitoring

- **UptimeRobot** : monitorer `https://api.pronokif.com/docs` (5 min interval)
- **Sentry** : alertes sur > 10 erreurs/heure
- **MongoDB Atlas** : alertes CPU > 80%, connections > 100

## 6. Deploiement rapide (CI/CD)

Le workflow `.github/workflows/ci.yml` :
1. Lint + test + build sur chaque PR
2. Docker build check sur push `main`

Le CD (`.github/workflows/cd.yml` — a creer) :
1. Trigger : push `main` (apres CI vert)
2. Build images Docker
3. Push vers DigitalOcean Container Registry
4. Trigger re-deploy via `doctl apps update`

## 7. Rollback

```bash
# Lister les deployments
doctl apps list-deployments <app-id>

# Rollback au deploiement precedent
doctl apps create-deployment <app-id> --force-rebuild
```

## 8. Variables d'environnement (checklist)

| Variable | Backend | Frontend | Secret |
|---|---|---|---|
| `MONGO_URL` | x | | oui |
| `DB_NAME` | x | | |
| `JWT_SECRET` | x | | oui |
| `CORS_ORIGINS` | x | | |
| `SENTRY_DSN` | x | | oui |
| `VITE_BACKEND_URL` | | x | |
| `VITE_SENTRY_DSN` | | x | |
