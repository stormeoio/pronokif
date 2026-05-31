# Pronokif — Runbook operationnel

Derniere mise a jour : 31 mai 2026.
Production : `https://pronokif.eu` / commit de reference `301451b`.

## Installation from scratch (< 1h)

### Prerequis
- Docker + Docker Compose
- Node.js 20+
- Python 3.12+
- Comptes : DigitalOcean, MongoDB Atlas, Cloudflare, Sentry, GitHub

### Dev local (5 min)

```bash
# 1. Cloner
git clone https://github.com/catalanbaptiste123-source/pronokif.git && cd pronokif

# 2. Backend
cd backend
cp .env.example .env  # editer les valeurs
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. Frontend
cd ../frontend
cp .env.example .env  # VITE_BACKEND_URL=http://localhost:8000
npm ci --legacy-peer-deps

# 4. Lancer
# Option A : Docker Compose (recommande)
docker compose up

# Option B : Dev mode (hot reload)
# Terminal 1:
cd backend && uvicorn server:app --reload --port 8000
# Terminal 2:
cd frontend && npm run dev
```

### Production (30 min)

1. Provisionner MongoDB Atlas (voir DEPLOY.md section 1)
2. Creer l'app DigitalOcean (voir DEPLOY.md section 2)
3. Configurer Cloudflare DNS (voir DEPLOY.md section 3)
4. Configurer Sentry (voir DEPLOY.md section 4)
5. Pousser sur `main` → CI/CD + StormDeploy deploient automatiquement
6. Verifier le smoke test de release ci-dessous

### Smoke test post-deploy

```bash
# API
curl -fsS https://pronokif.eu/api/health
curl -fsS https://pronokif.eu/api/settings/branding

# Front bundle
curl -fsS https://pronokif.eu/ | rg -o 'assets/index-[A-Za-z0-9_-]+\\.js' | head -1

# Routes critiques a verifier au navigateur
# - /
# - /mentions-legales
# - /admin/auth
# - /admin/settings (doit rediriger vers /admin/auth hors session admin)
```

---

## Incidents courants

### Backend ne demarre pas

```bash
# Verifier les logs
docker compose logs backend

# Causes frequentes :
# 1. MONGO_URL invalide → verifier la connection string Atlas
# 2. JWT_SECRET < 32 chars → config.py fail-fast
# 3. Port 8000 deja utilise → lsof -i :8000
```

### Frontend page blanche

```bash
# 1. Verifier VITE_BACKEND_URL dans .env
# 2. Verifier que le backend repond
curl http://localhost:8000/docs

# 3. Rebuild
cd frontend && npm run build
```

### Deep link admin affiche une 404

```bash
# Comportement attendu depuis v0.4.2 :
# /admin/<tab>, /bo-admin/<tab> et /admin-bo/<tab>
# redirigent vers /admin?tab=<tab>, puis vers /admin/auth si non connecte.

curl -I https://pronokif.eu/admin/settings
```

Si le navigateur affiche encore la page 404 front, verifier que la prod sert bien un bundle posterieur a `301451b` et que le fichier `frontend/src/routes.tsx` contient la route `AdminTabRedirect`.

### MongoDB connection timeout

```bash
# Verifier la connectivite
mongosh "mongodb+srv://..." --eval "db.runCommand('ping')"

# Atlas : verifier whitelist IP
# Docker : verifier le network (mongo doit etre sur le meme network)
```

### Erreur CORS

```bash
# Backend : verifier CORS_ORIGINS dans .env
# Doit correspondre exactement au domaine frontend (avec https://)
# Pas de trailing slash
```

### Tests echouent en CI

```bash
# Reproduire localement
cd frontend && npm test
cd backend && pytest tests/ -v

# Causes frequentes :
# 1. Dep manquante → npm ci / pip install -r requirements.txt
# 2. Env var manquante → copier .env.example
# 3. MongoDB non disponible → docker compose up mongo
```

---

## Maintenance

### Backup MongoDB

```bash
# Atlas : backup auto active (daily, retention 7j)
# Manuel :
mongodump --uri="mongodb+srv://..." --out=./backup-$(date +%Y%m%d)
```

### Mise a jour des deps

```bash
# Backend
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt

# Frontend
npm outdated
npm update
```

### Logs

```bash
# Docker Compose
docker compose logs -f backend
docker compose logs -f frontend

# DigitalOcean
doctl apps logs <app-id> --type=run
```

### Release checklist admin

- `main`, `origin/main` et `stormeo/main` pointent sur le meme SHA.
- `npm run typecheck`, `npm run build`, `npm run lint` et `vitest` passent.
- Le footer admin affiche la bonne version.
- L'onglet Changelog liste la release courante.
- L'onglet DevOps reflete le statut reel de la prod.
- Le branding endpoint renvoie les logos, icones et couleurs attendus.
- Les uploads media admin sont testes avec une session admin active avant ouverture large.

---

## Contacts

| Role | Contact |
|---|---|
| Dev lead | developer@stormeo.io |
| Infra | DigitalOcean support |
| DB | MongoDB Atlas support |
