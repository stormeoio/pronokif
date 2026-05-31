# Pronokif

Pronokif est une application de pronostics F1 orientee ligues privees, competition entre joueurs et pilotage editorial/admin. Le produit cible la saison F1 2026/2027 avec un front PWA, un backend FastAPI/MongoDB et un back-office metier complet pour administrer les courses, les pronostics, les joueurs, les medias, la roadmap et la base de connaissance.

## Etat au 31 mai 2026

- Production : `https://pronokif.eu`
- Backend health : `https://pronokif.eu/api/health`
- Branche de reference : `main`
- Dernier smoke test prod : 31 mai 2026, 18:04 CEST
- Commit prod verifie : `301451b`
- Version applicative documentee : `v0.4.2`

## Fonctionnalites principales

- Authentification utilisateur, onboarding, ligues, invitations et profils.
- Parcours pronostics F1 compact en pipeline multi-etapes, avec support qualifications, course, sprint et bonus.
- Calendrier F1 2026, fiches courses, pilotes, circuits, ecuries et championnats.
- Classements, resultats, scoring, mini-jeux, notifications et activity logs.
- Back-office admin separe avec magic link, TOTP 2FA, session persistante et deep links metier.
- Mediatheque admin avec dossiers, upload/reutilisation d'images et selecteurs de vignettes.
- Legal/PWA administrable : mentions legales, CGU, confidentialite, manifest et assets PWA.
- Base knowledge/RAG F1 2026 et serveur MCP PronoKif pour exposer les entites de connaissance.
- Traductions limitees a l'interface utilisateur front ; les contenus utilisateurs restent dans leur langue d'origine et le back-office reste en francais.

## Architecture

```text
frontend/   React 19, Vite, TypeScript, Tailwind, TanStack Query, PWA
backend/    FastAPI, Pydantic, MongoDB, services domaine, routes admin
mcp/        Serveur MCP PronoKif Knowledge
docs/       Runbook et guide de deploiement
```

## Commandes utiles

```bash
# Frontend
cd frontend
npm ci --legacy-peer-deps
npm run typecheck
npm run lint
npx vitest run --coverage --coverage.reporter=text --coverage.thresholds.statements=20
npm run build

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/test_auth_magic_link.py tests/test_email_service.py tests/test_scoring.py tests/test_sync_helpers.py -v

# Stack locale
docker compose up
```

## Documentation

- [Roadmap 12 mois](ROADMAP_12MONTH.md)
- [Audit technique v0.4](AUDIT_V0.4.md)
- [Changelog](CHANGELOG.md)
- [Back-office admin](docs/BACK_OFFICE.md)
- [Design system](DESIGN.md)
- [Runbook operationnel](docs/RUNBOOK.md)
- [Guide de deploiement](docs/DEPLOY.md)
- [Serveur MCP Knowledge](mcp/pronokif-knowledge-mcp-server/README.md)

## Smoke test release

Dernier controle effectue le 31 mai 2026 :

- `npm run typecheck` : OK
- `npm run build` : OK
- `npm run lint` : OK, warnings historiques uniquement
- `vitest` : 31 fichiers, 159 tests passes
- `https://pronokif.eu/api/health` : healthy
- `https://pronokif.eu/api/settings/branding` : OK
- `/admin/settings` : redirige vers `/admin/auth` hors session admin, sans 404
- `/mentions-legales` : OK, sans erreur console
