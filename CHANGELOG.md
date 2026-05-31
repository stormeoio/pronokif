# Changelog

Toutes les dates sont en heure Europe/Paris. Le changelog applicatif visible dans le back-office est maintenu dans `frontend/src/pages/admin-bo/tabs/ChangelogTab.tsx`.

## v0.4.2 — 31 mai 2026

### Production et documentation

- Production `pronokif.eu` verifiee sur `main`, `origin/main` et `stormeo/main` au commit `301451b`.
- Smoke test final valide : health API, endpoint branding, page publique, page mentions legales et route admin profonde.
- Correction du deep link `/admin/settings` : hors session admin, la route aboutit proprement a `/admin/auth` au lieu d'afficher la 404 front.
- Documentation projet, roadmap, audit du jour, runbook, guide de deploiement et recap back-office actualises.

### A tester cote admin

- Acces direct `/admin/settings`, `/bo-admin/settings` et `/admin-bo/settings`.
- Footer admin : lien version vers l'onglet changelog.
- Onglets DevOps, Audit, Roadmap, Legal/PWA, Media, Settings, Users et Predictions.
- Upload media et reutilisation depuis la mediatheque avec une session admin active.

## v0.4.1 — 31 mai 2026

### Back-office, branding et i18n

- Section branding dans `admin/settings` pour remplacer logos, favicon, icones PWA et couleurs de theme.
- Nom applicatif fige : `PronoKif`.
- Traductions cadrees sur l'UI front uniquement ; contenus de ligues, pronostics, chats, scores, pseudos et feedbacks exclus des metriques de completion.
- Back-office admin garde une interface completement francaise.
- Footer admin avec numero de version cliquable vers le changelog.
- Onglets DevOps reorganises : Audit, Roadmap, Beta, Legal & PWA, Base RAG, Traductions.

## v0.4.0 — 31 mai 2026

### Audit et release readiness

- Audit technique v0.4 publie.
- Interface DevOps alignee sur les statuts reels CI/CD/prod.
- Roadmap et checklists de livrables synchronisees avec les taches realisees.
- Canary prod enrichi avec verification du bundle admin.

## v0.3.0 — 30-31 mai 2026

### Back-office metier, medias et circuits

- Dashboard admin enrichi avec KPIs compacts, derniers inscrits, derniers pronostics et derniers logs.
- Mediatheque admin avec dossiers, upload, reutilisation et selecteurs de vignettes.
- Cartes circuits interactives, hotspots et premiers virages identifies.
- Fiches joueurs enrichies : details, logs, pronostics, scores, notifications, support et actions manuelles.
- Parcours pronostics compact en pipeline multi-etapes.
