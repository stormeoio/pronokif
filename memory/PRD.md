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
- **Modèles**: Users, Leagues, Predictions, Leaderboard, Notifications, RaceResults, CustomPredictions, MinigameResults, MinigameAwards, UserStats, UserMissions
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

### Pronostics
- [x] **Top 10** au lieu de Top 3 pour qualifications et course
- [x] **Sprint Weekends** : Qualifications Sprint + Course Sprint (Top 10 chacun)
- [x] Sélection Pole Position
- [x] Countdown jusqu'à clôture
- [x] Verrouillage automatique

### Paris Bonus
- [x] Safety Car (+3 pts)
- [x] **DNF Pilotes** - Sélection multiple jusqu'à 5 pilotes (+2 pts par pilote correct)
- [x] Meilleur Tour (+5 pts)
- [x] **Leader 1er Virage** (+3 pts)

### Pronostics Personnalisés ✅ NEW
- [x] Créer des pronostics personnalisés par ligue
- [x] Types: Oui/Non, Texte libre, Choix multiples
- [x] Le créateur définit la bonne réponse après la course
- [x] +2 points pour chaque bonne réponse
- [x] Interface complète de création et réponse

### Avatars Personnalisés ✅ NEW
- [x] **15 avatars classiques** (Loup, Aigle, Lion, Gamer, Champion, Star, etc.)
- [x] **10 avatars écuries** stylisés avec couleurs d'équipes
- [x] **20 avatars pilotes** - Silhouettes avec numéros (#1 Verstappen, #44 Hamilton, etc.)
- [x] **Upload photo** depuis galerie (max 500KB)
- [x] Modal de sélection avec 4 catégories

### Système XP & Missions ✅ NEW
- [x] Niveaux 1-50 avec paliers XP croissants
- [x] **35 missions** réparties en 4 catégories:
  - **Assiduité**: 10/50/100/500/1000 pronostics, weekends complets
  - **Performance**: Pole 1/5/10/15/25x, Winner 1/5/10/15/25x, pronostics corrects
  - **Social**: Créer ligue, rejoindre ligues, pronostics personnalisés
  - **Mini-jeux**: Parties jouées, victoires, records
- [x] Réclamation des récompenses XP
- [x] Notifications de level up

### Mini-Jeux ✅ NEW
- [x] **Reaction Time** - Simulation départ F1 avec 5 feux rouges
- [x] **Batak Pro** - Cibles à cliquer en 30 secondes
- [x] **Mode Entraînement** illimité
- [x] **Mode Compétition** - 3 essais par jeu par weekend
- [x] Classements par ligue et global
- [x] **+2 points** au gagnant de chaque jeu (attribution admin)

### Classements ✅ NEW
- [x] Classement par ligue (points totaux)
- [x] Classement par weekend de course
- [x] **Classement Global** visible par tous avec podium
- [x] Position mondiale affichée sur le profil

### Admin & Points
- [x] Interface Admin pour entrer résultats officiels (/admin)
- [x] Support Top 10 et Sprint dans l'admin
- [x] Bouton Sync OpenF1 pour récupérer résultats automatiquement
- [x] Calcul automatique des points après saisie résultats
- [x] Attribution des points mini-jeux
- [x] Mise à jour XP + Level up automatique

### Notifications
- [x] Page notifications (/notifications)
- [x] Badge non-lus dans navigation
- [x] Notifications: résultats, level up, victoire mini-jeu
- [x] Endpoint rappel 24h avant clôture

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
| Pronostic perso correct | +2 |
| Victoire mini-jeu | +2 |

## Sprint Weekends 2026
- Chine (Mars)
- Miami (Mai)
- Autriche (Juillet)
- Austin (Octobre)
- Brésil (Novembre)
- Qatar (Novembre)

## Pages Frontend

| Route | Description |
|-------|-------------|
| /auth | Connexion/Inscription |
| /set-username | Choix du pseudo |
| /league | Créer/Rejoindre ligue |
| / | Dashboard principal |
| /predictions/:raceId | Faire ses pronostics |
| /leaderboard | Classement de la ligue |
| /leaderboard/global | Classement mondial |
| /results | Historique des résultats |
| /profile | Profil utilisateur + avatars |
| /admin | Administration (résultats) |
| /notifications | Notifications |
| /missions | Missions & achievements |
| /minigames | Mini-jeux (Reaction/Batak) |
| /custom-predictions | Pronostics personnalisés |

## Backlog Restant

### P2 (Future)
- [ ] Push notifications
- [ ] Historique détaillé des points par course
- [ ] Comparaison directe entre joueurs
- [ ] Badges/achievements visuels
- [ ] Cron job pour envoyer rappels auto

---
*Dernière mise à jour: 13 Mars 2026 - v3.0 avec Avatars, Missions, Mini-jeux, Pronostics Perso*
