# Security policy — Pronokif

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public GitHub issue.
Email the maintainer directly with details and a proof of concept if possible.
We aim to acknowledge within 48 h and ship a fix or mitigation within 7 days
for critical issues.

---

## Known historical exposures (resolved)

### 2026-05-16 — Hardcoded `JWT_SECRET` fallback

**What happened.** Up to and including commit [`f74f90c`], `backend/server.py`
and `backend/server_backup.py` contained a hardcoded fallback secret used to
sign authentication tokens when the `JWT_SECRET` environment variable was not
set:

```python
JWT_SECRET = os.environ.get('JWT_SECRET', 'pronokif-secret-key-2026')
```

Because the repository was public, this fallback value was discoverable by
anyone reading the source. An attacker who learned that a deployment had not
overridden `JWT_SECRET` could have forged authentication tokens for any user.

**Resolution.**

| Commit | Action |
|---|---|
| `2536abc` | Removed the legacy `server_backup.py` / `server_new.py` / `server_refactored.py` files (3 obsolete copies of the monolith). |
| `803b183` | Dropped the hardcoded fallback. `JWT_SECRET` is now mandatory at boot, must be ≥ 32 chars, and the process refuses to start otherwise. |
| Operations | All deployment environments must rotate `JWT_SECRET` to a fresh value generated with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Existing user sessions are invalidated by the rotation (intended). |

**Why we did not rewrite git history.** The fallback string itself only had
value when paired with a deployment that had not set `JWT_SECRET`. Once every
environment rotates to a strong, environment-specific secret (S0-4 of the
A2 refactor plan), tokens forged with the old leaked value no longer validate
on any running instance. Force-pushing a rewritten history would invalidate
every external fork and every link to a commit SHA on GitHub for no
operational gain. The rotation closes the actual attack surface.

### 2026-05-16 — Stale `.env` files in git history

**What happened.** Two non-secret `.env` files were committed and later
deleted (`backend/.env`, `frontend/.env`). They contained:
- `MONGO_URL=mongodb://localhost:27017`
- `DB_NAME=test_database`
- `CORS_ORIGINS="*"`
- `REACT_APP_BACKEND_URL=https://podium-clash.preview.emergentagent.com`
- `WDS_SOCKET_PORT=443`, `ENABLE_HEALTH_CHECK=false`

**Resolution.** No credentials, API keys, database passwords, or signing
secrets were ever stored in these files — they only carried local-dev
endpoints. The files have been removed from the working tree, the
`.gitignore` was deduplicated and now allows `.env.example` while still
ignoring `.env`/`.env.*.local`/etc., and `.env.example` templates document
every variable the application reads.

---

## Secrets management — operating policy

1. **Never commit a real `.env` file.** The `.gitignore` is configured
   to keep `.env`, `.env.local`, `.env.development`, `.env.production`,
   `.env.staging`, and `.env.*.local` out of git, while allowing
   `.env.example` and `.env.template` so contributors see what to fill in.
2. **Generate per-environment secrets.** Dev, staging, and prod must each
   carry their own `JWT_SECRET`, `MONGO_URL` credentials, etc. Never share.
3. **Rotate on incident.** If a secret is suspected to be exposed, rotate
   it immediately — that is the one mitigation that always works, even
   when removing the secret from git history is impractical.
4. **Use the platform vault in production.** When deploying to
   DigitalOcean App Platform / Cloudflare / etc. (Sprint 4), set secrets
   via the platform's encrypted env-var UI, not via committed config.

---

## Boot-time guards

`backend/config.py` implements fail-fast checks at process start:

- `MONGO_URL`, `DB_NAME`, `JWT_SECRET` are required — missing any
  raises `RuntimeError` immediately and points to `backend/.env.example`.
- `JWT_SECRET` must be at least 32 characters of entropy. Shorter values
  are refused with a clear message and the exact one-liner to generate
  a strong replacement.

These guards are intentional: they make misconfiguration a loud failure
at boot rather than a silent vulnerability at runtime.

---

## Roadmap (excerpt — see `PLAN_REFACTO.md`)

| Sprint | Item | Status |
|---|---|---|
| S0-4 | Drop hardcoded `JWT_SECRET` fallback, enforce length | ✅ Done |
| S0-6 | Run `gitleaks` on the full repo + history | ⏳ |
| S0-7 | Hardened CORS (no `*` in prod), rate limiting, security headers | ⏳ |
| S4   | Sentry integration, dependency scanning in CI, Snyk | ⏳ |
