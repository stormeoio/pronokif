# Changelog

Toutes les dates sont en heure Europe/Paris. Le changelog applicatif visible dans le back-office est maintenu dans `frontend/src/pages/admin-bo/tabs/ChangelogTab.tsx`.

## v0.5.1 — 6 juin 2026

### Fiches pilotes et visuels
- Refonte page pilote immersive : hero bandeau plein ecran avec photo pilote en position absolue, gradient equipe, numero watermark geant, diagonales decoratives.
- Upload photos pilotes dark/light dans l'admin : deux zones drag-drop (Moon/Sun), processing Pillow auto, resolver avec fallback multi-niveaux.
- Photos admin visibles sur les pages publiques : `get_details()` et `get_all()` enrichis depuis la DB admin.
- Photos admin dans le classement championnat : fetch `/drivers/all` pour enrichir les standings Ergast.
- Radar chart SVG 5 axes (vitesse, depassements, regularite, gestion pneus, qualifications) + cercles de progression.
- Photo CDN fallback 2col-retina (640px) au lieu de 1col (80px) pour les pilotes sans photo admin.
- Format attendu : PNG 1024x1024 fond transparent (detoure).

### Dark/light mode admin
- Variables shadcn/ui (--background, --foreground, --card, --input, --border, --muted, --accent, etc.) overridees pour light mode — tous les composants shadcn (Button, Input, Switch, Select) passent correctement en clair.
- 177 overrides CSS `.admin-light` couvrant : grays, borders, text, status colors, hover states, ring/divide, gradient, cyan accent, placeholders, dividers, focus rings, shadows, scrollbar.
- Native form elements avec `color-scheme: light`, scrollbar Webkit light.
- Sidebar wordmark swap dark/light automatique.

### Mobile-first et PWA
- Viewport public cappe a `max-w-md` (448px) centre sur desktop — rendu mobile-only coherent.
- Bottom nav et ScrollToTop contraints a la colonne mobile.
- Section PWA dans le profil : installer (beforeinstallprompt), mettre a jour (SW waiting), installe (standalone), instructions manuelles iOS/Android/Desktop, vider le cache.
- Hook `usePwaInstall` + `useSwUpdate` reutilisables.

### Corrections
- Toast erreur upload photo resolu : auto-save silent, plus de double toast.
- Avatars liste admin : fallback `photo_url_dark > photo_url_light > photo_url`.
- DriverCard onError fallback vers F1 CDN generique.
- Dead code `DriverTabs.tsx` supprime (320 lignes).
- `launch.json` corrige pour `npm run dev --prefix frontend` port 3000.

### Backend
- `photo_url_dark` et `photo_url_light` sur `DriverCreate`, `DriverUpdate`, `DriverResponse`.
- `get_all()` devenu async avec bulk fetch admin photos.
- Media upload : Pillow processing etendu a `driver_dark` et `driver_light`.

## v0.5.0 — 5 juin 2026

### Admin Pilotes & Ecuries
- Interface admin CRUD complete : liste groupee par ecurie, photos F1 CDN HD (2col-retina), logos 640px, drag-drop upload (min 1024x1024px).
- Avatars pilotes Pronokif : headshots F1 officiels dans le selecteur d'avatar, cadre couleur ecurie + badge numero.
- Seed endpoint `/admin-bo/drivers/seed` + sync-avatars depuis le catalogue F1 2026.

### Securite et qualite
- CSP report-only : header sur toutes les reponses API, endpoint `/api/csp-report` pour les violations.
- MIME hardening : SVG bloque (vecteur XSS), validation magic-bytes, Cache-Control sur medias.
- Zod : validation des 5 endpoints critiques (drivers, races, leagues, session, predictions).
- Suppression des 11 `Record<string,any>` : types Driver/DriverDetails propres.

### Performance
- Bundle admin decoupe : 13 tabs → lazy() + Suspense (AdminLayout -60%).
- LazyImage : composant drop-in avec skeleton pulse et fade-in.
- Pull-to-refresh sur Dashboard, Courses et Fiche Grand Prix.

### DevOps et monitoring
- Canary CD ameliore : 3 phases (bundle hash + health + 5 endpoints critiques).
- Monitoring externe : healthcheck.yml cron 30min (frontend + backend + 3 endpoints).
- PWA update toast : detection de nouveau service worker + bouton Recharger.

### Corrections
- Badges prediction sur la page Courses (fix TanStack Query Set→string[]).
- Fix navigation Cartes Circuits (useEffect URL guard quand on change d'onglet).
- Photos pilotes HD : transform 1col→2col-retina (fix fallback pour Verstappen, Perez, Bottas).
- Re-seed force=true pour mettre a jour les URLs existantes en DB.

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
