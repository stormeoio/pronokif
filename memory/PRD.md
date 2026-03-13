# PRONOKIF - PRD

## Problème Original
Application de pronostics F1 entre amis avec design gaming arcade.

## Choix Utilisateur
- Nom: **PRONOKIF**
- Design: **Arcade F1 coloré et lumineux** (Mars 2026)
  - Fond bleu dégradé (ciel)
  - Logo doré 3D avec drapeaux à damier
  - Cadres chrome/aluminium brossé
  - Bandes rouge/blanc (kerbs)
  - Effets néon bleu sur les cartes
  - Texture asphalte pour certains éléments

## Architecture Technique

### Backend (FastAPI + MongoDB)
- **Auth**: JWT + bcrypt + système XP/Niveau
- **Modèles**: Users, Leagues, Predictions, Leaderboard, Notifications, RaceResults, CustomPredictions, MinigameResults, MinigameAwards, UserStats, UserMissions

### Frontend (React + Tailwind)
- **Fonts**: Racing Sans One (titres), Oswald (corps), JetBrains Mono (données)
- **Components**: shadcn/ui + styles arcade personnalisés

## Design System v2.0 (Arcade F1)

### Couleurs
- Sky Gradient: #1a4a8a → #4a9fea → #7dd3fc
- Racing Red: #e63946
- Trophy Gold: #fbbf24
- Chrome: #d1d5db → #6b7280
- Neon Blue: #3b82f6
- Asphalt: #374151

### Éléments Visuels
- `.bg-sky-racing` - Fond dégradé ciel
- `.bg-chrome` - Aluminium brossé
- `.bg-checkered` - Motif damier
- `.bg-kerb-stripe` - Bandes rouge/blanc
- `.card-chrome` - Cartes métalliques
- `.card-neon` - Cartes avec effet néon bleu
- `.card-gold` / `.card-racing` - Cartes colorées
- `.btn-racing` - Boutons rouges
- `.btn-gold` - Boutons dorés
- `.btn-chrome` - Boutons métalliques
- `.text-gold-3d` - Texte doré avec effet 3D

## Fonctionnalités Implémentées ✅

### Core
- [x] Authentification JWT
- [x] Système XP/Niveau (1-50)
- [x] Ligues avec code 6 caractères

### Pronostics
- [x] Top 10 pour qualifications et course
- [x] Sprint Weekends
- [x] Paris Bonus (Safety Car, DNF, Fastest Lap, Leader 1er virage)
- [x] Pronostics Personnalisés par ligue

### Avatars (45 total)
- [x] 15 avatars classiques
- [x] 10 avatars écuries stylisées
- [x] 20 avatars pilotes (silhouettes avec numéros)
- [x] Upload photo personnalisée

### Missions (35 total)
- [x] Assiduité: 10/50/100/500/1000 pronostics
- [x] Performance: Pole, Winner, corrects
- [x] Social: Ligues, pronostics perso
- [x] Mini-jeux: Parties, victoires

### Mini-Jeux
- [x] Reaction Time (feux F1)
- [x] Batak Pro (30 secondes)
- [x] Mode Entraînement illimité
- [x] Mode Compétition (3 essais/weekend)
- [x] +2 points au gagnant

### Classements
- [x] Par ligue
- [x] Par weekend
- [x] Global visible par tous

## Pages

| Route | Description |
|-------|-------------|
| /auth | Connexion/Inscription |
| / | Dashboard |
| /predictions/:raceId | Pronostics |
| /leaderboard | Classement ligue |
| /leaderboard/global | Classement mondial |
| /profile | Profil + avatars |
| /missions | Missions |
| /minigames | Mini-jeux |
| /custom-predictions | Pronos perso |
| /admin | Administration |
| /notifications | Notifications |

## Backlog

### P2 (Future)
- [ ] Push notifications
- [ ] Historique détaillé
- [ ] Comparaison joueurs
- [ ] Badges visuels

---
*Dernière mise à jour: 13 Mars 2026 - v3.0 avec nouveau design Arcade F1*
