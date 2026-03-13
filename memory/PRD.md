# PRONOKIF - PRD

## Problème Original
Application de pronostics F1 entre amis avec design gaming arcade.

## Choix Utilisateur
- Nom: **PRONOKIF**
- Design: Gaming arcade (métallique, néon orange/cyan)
- Auth: JWT
- Données F1: Statiques (saison 2026)
- Notifications: In-app

## Architecture Technique

### Backend (FastAPI + MongoDB)
- **Auth**: JWT + bcrypt + système XP/Niveau
- **Modèles**: Users, Leagues, Predictions, Leaderboard, Notifications, RaceResults, CustomPredictions
- **Données F1**: 20 pilotes, 25 courses (saison 2026 avec 6 Sprint Weekends)
- **Scoring**: Pole(5), Top10 exact(3), Top10 présent(1), Winner(10), Bonus(+2 à +5)

### Frontend (React + Tailwind)
- **Theme**: "Gaming Arcade" - néon orange/cyan, fond sombre, effets glow
- **Typography**: Orbitron (titres), Rajdhani (corps), JetBrains Mono (données)
- **Components**: shadcn/ui + effets gaming personnalisés

## Fonctionnalités Implémentées ✅

### Core
- [x] Authentification JWT (inscription/connexion)
- [x] Choix pseudo + système XP/Niveau
- [x] Création/rejoindre ligues avec code 6 caractères
- [x] Partage invitation (Web Share API / WhatsApp)

### Pronostics (Mis à jour Mars 2026)
- [x] **Top 10** au lieu de Top 3 pour qualifications et course
- [x] **Sprint Weekends** : Qualifications Sprint + Course Sprint (Top 10 chacun)
- [x] Sélection Pole Position
- [x] Countdown jusqu'à clôture
- [x] Verrouillage automatique

### Paris Bonus (Mis à jour Mars 2026)
- [x] Safety Car (+3 pts)
- [x] **DNF Pilotes** - Sélection multiple jusqu'à 5 pilotes (+2 pts par pilote correct)
- [x] Meilleur Tour (+5 pts)
- [x] **Leader 1er Virage** - Nouveau pronostic (+3 pts)

### Admin & Points
- [x] Interface Admin pour entrer résultats officiels (/admin)
- [x] Support Top 10 et Sprint dans l'admin
- [x] **Bouton Sync OpenF1** pour récupérer les résultats automatiquement
- [x] Calcul automatique des points après saisie résultats
- [x] Mise à jour XP + Level up automatique
- [x] Mise à jour classement ligue

### Notifications
- [x] Page notifications (/notifications)
- [x] Badge non-lus dans navigation
- [x] Notifications: résultats disponibles, level up
- [x] Endpoint rappel 24h avant clôture

### Design Gaming
- [x] Logo PRONOKIF avec effet métallique
- [x] Countdown cyberpunk bleu cyan
- [x] Boutons avec glow orange
- [x] Cards avec bordures néon
- [x] Navigation gaming avec effets
- [x] Badge "Sprint Weekend" sur les courses concernées

## Système de Points

| Action | Points |
|--------|--------|
| Pole exacte | +5 |
| Top 10 position exacte | +3 |
| Top 10 pilote présent | +1 |
| Vainqueur exact | +10 |
| Safety Car correct | +3 |
| DNF pilote correct | +2 (par pilote) |
| Fastest Lap exact | +5 |
| Leader 1er virage exact | +3 |

## Sprint Weekends 2026
- Chine (Mars)
- Miami (Mai)
- Autriche (Juillet)
- Austin (Octobre)
- Brésil (Novembre)
- Qatar (Novembre)

## API Endpoints Clés

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/username
- GET /api/auth/me

### Leagues
- POST /api/leagues
- POST /api/leagues/join
- GET /api/leagues/my
- GET /api/leagues/{id}/leaderboard

### Predictions
- POST /api/predictions
- GET /api/predictions/race/{race_id}
- GET /api/predictions/history

### Admin
- GET /api/admin/races
- POST /api/admin/results/{race_id}
- POST /api/admin/sync-results/{race_id}

## Backlog Restant

### P1 (Nice to have)
- [ ] Pronostics personnalisés par ligue (endpoints créés, UI à faire)
- [ ] Avatars personnalisés
- [ ] Badges/achievements
- [ ] Cron job pour envoyer rappels auto

### P2 (Future)
- [ ] Push notifications
- [ ] Historique détaillé des points
- [ ] Comparaison directe entre joueurs

---
*Dernière mise à jour: 13 Mars 2026 - v3.0 avec Top 10, Sprint Weekends, DNF multi-pilotes, Leader 1er virage*
