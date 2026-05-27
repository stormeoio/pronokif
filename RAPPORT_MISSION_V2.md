# PronoKif — Rapport de Mission & Etat des Lieux

**Prepare pour :** Baptiste (Fondateur & porteur de projet)
**Date :** 27 mai 2026
**Redige par :** Equipe Stormeo (Architecture, Securite, Design, DevOps)
**Version :** 2.0

---

## 1. CONTEXTE DE LA MISSION

### 1.1 Le projet PronoKif

PronoKif est une **application de pronostics F1 gamifiee** destinee aux fans de Formule 1 en Europe (18-35 ans, mobile-first). Le produit combine pronostics qualifications + course, ligues entre amis, mini-jeux, classements en temps reel et une experience "plus fun que l'officiel".

**Marche cible :** 500K-1M de fans F1 competitifs EU/UK
**Concurrents :** F1 Fantasy (officiel), GridRival, Sorare
**Tagline :** Pronostiquez. Defiez. Vivez.

### 1.2 Objectif de la mission

Baptiste a developpe une premiere version fonctionnelle de PronoKif avec l'aide d'outils IA (Emergent/Replit) entre mars et avril 2026. L'application disposait deja des fonctionnalites coeur (auth, pronostics, ligues, mini-jeux, classements) mais presentait des **faiblesses structurelles** empechant un lancement en production.

**Mission confiee a Stormeo :** Auditer le projet, le refactoriser integralement, le securiser, construire l'identite de marque et le deployer — dans l'objectif d'une **beta publique T2 2026**.

---

## 2. ETAT INITIAL : LE PROJET RECUPORE (v0, Avril 2026)

### 2.1 Audit v0.1 — Score global : 4.4/10

L'audit initial du 17 avril 2026 a revele un projet en etat **pre-alpha non productif**, avec 12+ points bloquants critiques.

| Categorie | Score v0 | Statut |
|-----------|----------|--------|
| Securite | 5/10 | Critique — JWT en dur, tokens localStorage, aucun rate limiting |
| Architecture | 4/10 | Critique — server.py monolithe de 2,210 lignes |
| Qualite de code | 5/10 | Faible — 1,137 erreurs de lint, pas de types |
| Tests | 3/10 | Critique — 5 fichiers de test, aucune couverture frontend |
| DevOps | 2/10 | Critique — aucun Docker, aucun CI/CD, deploiement manuel |
| Monitoring | 0/10 | Inexistant |
| Conformite | 3/10 | Critique — aucune politique de securite |

### 2.2 Problemes bloquants identifies

```
SECURITE (bloque le lancement)
  - JWT_SECRET en dur dans le code source
  - Tokens d'authentification stockes en localStorage (vulnerable XSS)
  - Aucune limitation de debit (brute force possible)
  - CORS trop permissif (accepte toutes origines)
  - Aucune validation des mots de passe
  - Aucune verification email
  - Aucun mecanisme de reset password

ARCHITECTURE (bloque la maintenance)
  - server.py : 2,210 lignes dans un seul fichier
  - Frontend en JavaScript pur (pas de TypeScript)
  - Build outil obsolete (Create React App + Craco)
  - 49+ casts "as any" dans le code
  - Aucune separation route/service/modele claire

OPERATIONS (bloque le deploiement)
  - Aucun Dockerfile
  - Aucun pipeline CI/CD
  - Aucun monitoring
  - Aucun scan de secrets
  - Aucune sauvegarde automatisee
```

### 2.3 Ce qui fonctionnait deja

Le travail de Baptiste avait pose des **fondations produit solides** :
- Concept et gameplay valides (pronostics quali + course, ligues, mini-jeux)
- Stack technique viable (FastAPI + React 19 + MongoDB)
- Integration API OpenF1 (donnees de course gratuites et fiables)
- UX/UI deja agreable (score 7/10 malgre les problemes techniques)
- ~20 pages frontend, ~25 endpoints API fonctionnels

---

## 3. PLANNING DE LA MISSION (16 Mai — 27 Mai 2026)

### 3.1 Vue chronologique

```
SEMAINE 1 (16-18 mai) — Fondations
├── S0  Securite urgente (JWT, gitleaks, headers, rate limiting)
├── S1  Decomposition monolithe backend (2,210L → 109L + 17 routes)
├── S2  Migration frontend CRA → Vite + TypeScript complet
├── S3  Decomposition frontend + React Query sur toutes les pages
├── S4  Docker + CI/CD + 21 tests frontend + 13 E2E Playwright
├── S5  Qualite (Ruff 0 issues, ESLint, Husky, cleanup)
└── S6  Back-office admin + deploiement StormDeploy + Sentry
        → Audit v0.2 : score 6.5/10 (beta deployable)

SEMAINE 2 (19-22 mai) — Securite & Qualite
├── S7  httpOnly cookies, JWT 1h+refresh 7d, password validation
├── S8  Reset password, verification email, decomposition admin
├── S9  47 index MongoDB, pagination, health checks, backup
├── S10 Polish sync.py, elimination "as any", RoadmapTab refacto
├── S11 25 tests scoring engine, 14 tests sync, k6 load test
└── S12 Pydantic 100%, audit type:ignore/noqa

SEMAINE 3 (22-27 mai) — Branding & Features
├── S13 Design System v2 complet (DESIGN.md + brand.ts + tokens)
├── S14 Magic link login, Admin TOTP 2FA, email verification
├── S15 Race media sync, live results, back-office data flows
└── S16 Splash screen, branded emails, PWA icons v2, polish
        → Audit v0.3 : score 8.0/10 (production-ready)
```

### 3.2 Effort realise

| Metrique | Valeur |
|----------|--------|
| Duree de la mission | 12 jours (16-27 mai 2026) |
| Commits de refactorisation | 100+ |
| Fichiers modifies | 140+ |
| Lignes ajoutees | 12,353 |
| Lignes supprimees | 3,901 |
| Sprints completes | 16 |

---

## 4. ETAT ACTUEL : PRONOKIF v0.3 (27 Mai 2026)

### 4.1 Score global : 8.0/10 — PRODUCTION-READY

| Categorie | v0 (Avril) | v0.3 (Aujourd'hui) | Progression |
|-----------|------------|---------------------|-------------|
| **Securite** | 5/10 | **8.5/10** | +3.5 |
| **Architecture** | 4/10 | **8.5/10** | +4.5 |
| **Qualite de code** | 5/10 | **9/10** | +4.0 |
| **Performance** | 6/10 | **8/10** | +2.0 |
| **Tests** | 3/10 | **7.5/10** | +4.5 |
| **DevOps** | 2/10 | **8/10** | +6.0 |
| **UX/UI** | 7/10 | **8.5/10** | +1.5 |
| **Mobile** | 5/10 | **7.5/10** | +2.5 |
| **Monitoring** | 0/10 | **6/10** | +6.0 |
| **Conformite** | 3/10 | **6/10** | +3.0 |
| **SCORE GLOBAL** | **4.4/10** | **8.0/10** | **+3.6** |

### 4.2 Metriques de l'application

| Metrique | Avant | Apres | Evolution |
|----------|-------|-------|-----------|
| Backend (LOC) | ~3,500 | 15,710 | x4.5 |
| Frontend (LOC) | ~12,000 | 36,598 | x3 |
| Endpoints API | ~25 | 131 | x5 |
| Pages frontend | ~20 | 74 | x3.7 |
| Composants | ~15 | 83 | x5.5 |
| Hooks custom | ~2 | 16 | x8 |
| Modeles Pydantic | ~8 | 40 | x5 |
| Index MongoDB | 0 | 47 | nouveau |
| Fichiers de test | ~5 | 35 | x7 |
| LOC tests | ~400 | 6,659 | x16 |
| Erreurs lint | 1,137 | 0 | -100% |
| `as any` TypeScript | 49 | 0 | -100% |
| Dockerfiles | 0 | 3 | nouveau |
| Workflows CI/CD | 0 | 2 | nouveau |

### 4.3 Securite — Tous les points critiques resolus

| Menace | Avant | Maintenant |
|--------|-------|------------|
| Vol de session (XSS) | Tokens en localStorage | httpOnly cookies SameSite |
| Secret JWT faible | En dur dans le code | Variable d'env, min 32 chars |
| Brute force login | Aucune protection | Rate limit 5 req/min/IP |
| Comptes fantomes | Aucune verification | Email verification obligatoire |
| Mot de passe faible | Aucune validation | Min 8, maj+min+chiffre |
| Pas de recuperation | Aucun reset password | Token 30min, rate limited |
| Admin non protege | Token simple | Magic link + TOTP 2FA |
| Fuite de donnees | CORS permissif | Origines strictes, security headers complets |

---

## 5. FOCUS : TRAVAIL DE BRANDING

### 5.1 Avant : une identite generique

Le projet initial utilisait des couleurs Tailwind par defaut (#EF4444 pour le rouge, #09090b pour le noir), aucune typographie distinctive, aucun logo dans l'application, des emails en texte brut et aucune charte de marque documentee. L'interface fonctionnait mais ne communiquait pas l'identite PronoKif.

### 5.2 Direction artistique : "Broadcast Premium"

Nous avons defini et implemente une direction artistique complete nommee **Broadcast Premium** — l'ambiance d'une retransmission F1 haut de gamme, cinematique et immersive :

> *La sensation de regarder un Grand Prix en nocturne depuis le muret des stands. Serieux dans l'execution, fun dans l'experience. Premium mais accessible.*

**Decision fondamentale :** dark-only. Pas de mode clair. Le noir est une decision de design, pas une option — coherent avec tous les concurrents F1 et l'ambiance broadcast nocturne.

### 5.3 Palette officielle de marque

| Nom | Code | Usage |
|-----|------|-------|
| **Rouge Vitesse** | `#E10600` | Couleur signature — CTAs, accents, selections, liens actifs |
| **Blanc Piste** | `#F4F4F4` | Texte principal sur fond sombre |
| **Noir Carbone** | `#0B0D12` | Background principal, fondation de l'interface |
| **Gris Titane** | `#5F6673` | Texte secondaire, labels, metadata |
| **Anthracite** | `#1A1D24` | Surfaces elevees, inputs, hovers, menus |

**Couleurs semantiques :**
- Emerald `#10b981` pour les succes et points gagnes
- Amber `#f59e0b` pour les warnings et accents secondaires
- Podium : Or `#FFD700`, Argent `#C0C0C0`, Bronze `#CD7F32`

**Couleurs d'ecurie F1 :** 10 couleurs de bande laterale (Red Bull, Ferrari, McLaren, Mercedes...) pour les vues live et pronostics.

### 5.4 Typographie — 3 familles, 3 fonctions

| Font | Role | Exemple d'usage |
|------|------|-----------------|
| **Racing Sans One** | Display / Hero | Titres h1-h3, noms de GP, classements, splash |
| **Chivo** (variable, 100-900) | Body | Texte courant, descriptions, paragraphes |
| **JetBrains Mono** | Data / Chiffres | Scores, rangs, pourcentages, timers, ecarts |

La hierarchie typographique est **stricte** : Racing Sans One pour l'impact, Chivo pour la lecture, JetBrains Mono pour la data. Pas de gradients sur le texte — la lisibilite des donnees est prioritaire.

### 5.5 Logo kit officiel v1

Le kit logo a ete integre dans l'application avec **5 variantes SVG** :

| Variante | Dimensions | Usage |
|----------|------------|-------|
| Icone app (black+red) | 297x297 | Favicon, PWA, notifications, splash compact |
| Wordmark horizontal (white+red) | 1139x187 | Menus, headers, splash, auth (fond sombre) |
| Wordmark horizontal (black+red) | 1139x187 | Documents, exports, partenaires (fond clair) |
| Symbole seul (white+red) | 405x338 | UI compacte, avatars internes (fond sombre) |
| Symbole seul (black+red) | 405x338 | Print, docs, exports (fond clair) |

**Regles d'usage documentees :**
- Zone de protection autour du logo
- Ne jamais reconstruire le wordmark avec une font web
- Le nom "PronoKif" s'ecrit toujours avec P et K majuscules
- Signature verbale : `PRONOSTIQUEZ. DEFIEZ. VIVEZ.` (avec `VIVEZ.` en Rouge Vitesse)

### 5.6 Splash screen cinematique

Le splash screen PronoKif a ete redesigne en composant standalone React (1,141 lignes) avec :

- **Video cinematique 9:16** plein ecran en background (12.1s, H.264+AAC)
- **App icon** avec halo glow Rouge Vitesse anime
- **Wordmark** officiel avec animation d'entree
- **Barre de progression** Rouge Vitesse, morphing en bouton "Commencer"
- **Bouton CTA "Border Glow"** : glow directionnel qui reagit au pointeur (mesh-gradient rouge/blanc)
- **Transition de sortie** : sweep rouge horizontal + flash blanc-rouge + fade vers auth
- **Performances** : animations GPU-only (transform + opacity), fallback motion reduite
- **Skip** : bouton "Passer" glass, sortie au tap ou fin de video

### 5.7 Emails de marque

Les emails transactionnels ont ete redesignes avec l'identite PronoKif :

| Email | Description |
|-------|-------------|
| Verification email | Logo + code + bouton VML Outlook |
| Reset password | Logo + lien securise + expiration affichee |
| Magic link (user) | Logo + bouton "Connexion en 1 clic" |
| Magic link (admin) | Logo + bouton admin + mention securite |
| Invitation ligue | Logo + nom de ligue + code d'acces |

**Caracteristiques techniques :**
- Layout table strict compatible Outlook
- Support **dark mode** et **light mode** client mail (`prefers-color-scheme`)
- Boutons **VML bulletproof** (Outlook rend les boutons en image, VML les rend interactifs)
- Logo wordmark officiel heberge (`/brand/pronokif-v1/`)
- HTML escape sur toutes les valeurs dynamiques (protection injection)

### 5.8 PWA & Icones

Les icones de l'application ont ete regenerees a partir du logo officiel v1 :
- Favicon 16px et 32px
- Apple touch icon (180px)
- PWA icon 192px et 512px
- Manifest aligne sur la charte : nom "PronoKif", theme color `#0B0D12`

### 5.9 Design tokens — source unique de verite

Tout le branding est centralise dans **3 fichiers** qui servent de source de verite :

| Fichier | Role |
|---------|------|
| `DESIGN.md` (22KB) | Charte de marque complete, regles universelles, decisions log |
| `brand.ts` (172 lignes) | Tokens TypeScript : couleurs, fonts, espaces, radii, z-index |
| `tailwind.config.cjs` | Variables CSS semantiques (HSL), integration design system |

Tout developpeur peut importer `brand.ts` et avoir acces a l'ensemble de la palette, des fonts et des tokens sans deviation possible.

### 5.10 Composants de marque

| Composant | Description |
|-----------|-------------|
| `.btn-pk` | Bouton primaire Rouge Vitesse, glow anime |
| `.btn-pk-glow` | CTA critique avec border glow directionnel pointer-aware |
| `.btn-pk-outline` | Bouton outline avec light au hover |
| `.btn-pk-ghost` | Bouton ghost pour actions secondaires |
| Cartes Featured | Border-left Rouge Vitesse + radial gradient |
| Bottom nav glass | Glass surface + backdrop-blur + icons Lucide |
| Live badge | Dot rouge anime (pulse) + texte uppercase |
| Podium colors | Or/Argent/Bronze pour le top 3 |
| Team strips | Bandes laterales couleur ecurie F1 2026 |

---

## 6. CE QUI RESTE A FAIRE

### 6.1 Actions immediates (1 semaine, ~12h de travail)

| Action | Effort | Impact |
|--------|--------|--------|
| Monitoring externe (UptimeRobot sur /readyz) | 30min | Alertes downtime en temps reel |
| Email provider reel (SendGrid ou SES) | 2h | Delivrabilite emails garantie |
| Header CSP (Content-Security-Policy) | 1h | Defense en profondeur |
| Decomposer PronoKifSplashScreen.tsx (1,141L) | 2h | Maintenabilite |
| Eliminer 20 appels fetch() bruts restants | 2h | Coherence API client |
| Coverage dans CI (pytest --cov, vitest --coverage) | 30min | Visibilite regressions |
| Tests E2E magic link + admin 2FA | 2h | Couverture flux critiques |
| Fixer 163 ESLint warnings | 1h | Hygiene code |

### 6.2 Fonctionnalites produit en attente

| Feature | Statut | Priorite |
|---------|--------|----------|
| Systeme de scoring live (temps reel pendant les GP) | Backend pret, frontend a integrer | Haute |
| Notifications push (PWA) | Infrastructure prete, implementation a faire | Haute |
| Paiement / Premium (Stripe) | Infrastructure prevue, non implementee | Moyenne |
| Onboarding guide (tutoriel premier lancement) | Non commence | Moyenne |
| Storybook (composants documentes) | Non commence | Basse |
| Google Analytics / mixpanel | Non commence | Moyenne |
| Mode offline (service worker cache) | PWA prete, cache a configurer | Basse |

---

## 7. SCENARIOS DE CONTINUATION

### Scenario A — "Lancement Beta Saison 2026" (recommande)

**Objectif :** Lancer la beta publique pour les dernieres courses de la saison F1 2026 (ete 2026)
**Cible :** 50-200 utilisateurs beta
**Effort :** 2-3 semaines, 1 developpeur

| Semaine | Livrables |
|---------|-----------|
| S1 | Polish technique (les 12h restantes) + email provider reel + monitoring |
| S2 | Scoring live integre + notifications push + onboarding simplifie |
| S3 | Beta test avec 50 utilisateurs, bugfix, analytics basiques |

**Budget estimatif :** 5,000 - 8,000 EUR
**Risques :** Calendrier serre, dependance a la disponibilite des GP restants en 2026

**Avantage :** Valider le produit avec de vrais utilisateurs avant la saison 2027. Collecte de feedback reel pour ajuster avant le lancement majeur.

---

### Scenario B — "Lancement Majeur Saison F1 2027"

**Objectif :** Application complete et scalable pour le debut de saison F1 2027 (mars 2027)
**Cible :** 1,000+ utilisateurs, monetisation active
**Effort :** 4-6 mois, 1-2 developpeurs

| Phase | Duree | Livrables |
|-------|-------|-----------|
| Phase 1 (Juin-Juillet) | 8 sem | Beta ete 2026 (= Scenario A) + retours utilisateurs |
| Phase 2 (Aout-Octobre) | 12 sem | Premium/Stripe, analytics avancees, CDN, cache Redis, SEO landing pages |
| Phase 3 (Nov-Fevrier) | 16 sem | App native (React Native ou Capacitor), tournois officiels, sponsorings, scaling infra |
| Phase 4 (Mars 2027) | Lancement | Beta ouverte 1,000+ users, support live GP, monitoring 24/7 |

**Budget estimatif :** 25,000 - 50,000 EUR (selon ambition et equipe)
**Risques :** Investissement significatif, necessite validation produit prealable (d'ou Phase 1 = beta ete)

**Avantage :** Produit complet, scalable, monetisable. Position de premier entrant credible sur le marche PronoF1 gamifie avant la saison 2027.

---

### Scenario C — "Pivot MVP Mobile-First"

**Objectif :** Transformer PronoKif en app mobile native avec le minimum de features pour valider le product-market fit
**Cible :** 500 utilisateurs sur App Store / Google Play
**Effort :** 3-4 mois, 2 developpeurs (1 mobile + 1 backend)

| Phase | Duree | Livrables |
|-------|-------|-----------|
| Phase 1 | 4 sem | Packaging Capacitor/Ionic de l'app web existante |
| Phase 2 | 4 sem | Push notifications natives, deep links, offline mode |
| Phase 3 | 4 sem | Soumission App Store + Google Play, beta TestFlight |
| Phase 4 | 4 sem | Landing page, ASO, campagne acquisition, feedback loop |

**Budget estimatif :** 15,000 - 30,000 EUR
**Risques :** Cout de maintenance double (web + mobile), validation Apple/Google peut prendre du temps

**Avantage :** Presence sur les stores, acquisition mobile native, notifications push fiables. L'app web actuelle (PWA) sert de version desktop.

---

## 8. RECOMMANDATION

**Nous recommandons le Scenario A (beta ete 2026) comme prochaine etape immediate**, suivi du Scenario B si la validation utilisateur est positive.

**Raisonnement :**
1. Le produit est **techniquement pret** — score 8/10, tous les bloquants P0-P1 resolus
2. La saison F1 2026 est **en cours** — fenetre d'opportunite pour tester avec de vrais GP
3. Le cout est **minimal** (5-8K EUR, 2-3 semaines) pour obtenir une **validation terrain reelle**
4. Les retours utilisateurs guideront les investissements Phase 2 (pas de sur-ingenierie prematuree)

Le passage de 4.4/10 a 8.0/10 en 12 jours demontre que les fondations sont desormais solides. L'enjeu n'est plus technique — il est produit. La prochaine etape est de mettre PronoKif entre les mains de vrais fans de F1.

---

## ANNEXES

### A. Stack technique actuelle

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | React + TypeScript + Vite | 19 / 5.7 / 6.0 |
| UI | Tailwind CSS + shadcn/ui + Framer Motion | 3.4 / latest / 11 |
| 3D | Three.js | 0.170+ |
| Backend | Python + FastAPI | 3.12 / 0.115 |
| Base de donnees | MongoDB (Motor async) | 7 |
| Auth | JWT httpOnly + Magic Link + TOTP 2FA | - |
| Deploiement | Docker + StormDeploy PaaS | Traefik 2.11 |
| CI/CD | GitHub Actions | 2 workflows |
| Monitoring | Sentry | Frontend + Backend |
| Tests | Pytest + Vitest + Playwright + k6 | - |

### B. Arborescence cles

```
backend/    20 routes, 19 services, 40 modeles, 15 fichiers test
frontend/   74 pages, 83 composants, 16 hooks, 18 fichiers test
infra/      3 Dockerfiles, 2 workflows, nginx, k6
branding/   5 logos SVG+PNG, DESIGN.md, brand.ts, emails branded
```

### C. URLs

- **Production :** https://pronokif.stormeo.io
- **Repository :** prive (GitHub)
- **Design system :** DESIGN.md (22KB, dans le repo)
- **Audit complet :** AUDIT_V0.3.md (dans le repo)
