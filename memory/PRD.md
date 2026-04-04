# PRONOKIF - PRD (Product Requirements Document)

## Vision du produit
PRONOKIF est une application de jeu de pronostics sur la Formule 1, permettant aux utilisateurs de s'inscrire, rejoindre ou créer des ligues, et de faire des pronostics sur les courses.

## Design
**Thème:** Arcade Gaming F1
- Fond bleu sombre profond (#050a14 à #0a1628)
- Éléments métalliques chrome
- Accents cyan néon (#22d3ee) et or (#fbbf24)
- Bandes kerb rouge/blanc comme séparateurs

## Fonctionnalités implémentées

### Authentification
- Inscription/Connexion par email
- JWT tokens
- Gestion du profil utilisateur
- **Historique de connexion** avec IP et User-Agent

### Ligues
- Création de ligue avec code d'invitation
- Rejoindre une ligue existante
- Chat de ligue avec notifications de messages non lus
- **Modification nom et description par le créateur**
- **Page de détails de ligue** avec classement et membres
- **Quitter une ligue** - Chaque membre peut quitter une ligue
- **Partage avec lien cliquable** - Bouton de partage génère un lien `/join/{code}`
- **Page d'invitation** - `/join/:code` affiche une prévisualisation de la ligue avant de rejoindre
- **Supprimer une ligue** - Le créateur peut supprimer sa ligue (avec confirmation)
- **Transférer la propriété** - Le créateur peut désigner un nouveau propriétaire parmi les membres

### Pronostics de Course - SYSTÈME SÉPARÉ
**Endpoints séparés:**
- `POST /api/predictions/sprint` - Pronostics sprint uniquement
- `POST /api/predictions/main` - Pronostics course principale uniquement

**Weekend Sprint (dates limites distinctes):**
- Sprint: Clôture 15 min avant SQ1 (qualifications sprint)
- Course: Clôture 15 min avant Q1 (qualifications principales)

**Interface à onglets:**
- Onglet "Sprint" : Pole SQ, Top 10 SQ, Vainqueur Sprint, Top 10 Sprint, Bonus Sprint
- Onglet "Course" : Pole Q, Top 10 Q, Vainqueur Course, Top 10 Course, Bonus Course

**Bonus (modifiables après validation):**
- Safety Car (OUI/NON)
- DNF Pilotes (sélection multiple)
- Meilleur Tour (sélection pilote)
- Leader 1er Virage (sélection pilote)

### Système de Points - AUDITÉ ET VALIDÉ (04/04/2026)
**Flux de calcul :**
1. `calculate_points()` : Calcule points pour qualifs, sprint, course, bonus + XP
2. `sync_race_from_api()` : Met à jour `db.leaderboard` avec `total_points`, `last_race_points`, `previous_position`
3. Endpoints `/leagues/{id}/leaderboard` et `/leaderboard/global` : Retournent les données dynamiquement

**Tests validés :**
- Création d'entrée leaderboard à la création de ligue ✅
- Mise à jour dynamique des points ✅
- Affichage `last_race_points` ✅
- Classement global trié correctement ✅

### Comptage des Pronostics
Chaque élément compte individuellement:
- Pole qualifications = 1 prono
- TOP 10 qualifications = 1 prono
- Winner = 1 prono
- Top 10 course = 1 prono
- Safety Car = 1 prono
- DNF = 1 prono
- Leader au premier virage = 1 prono
- Meilleur tour = 1 prono
**Total: 8 pronos en weekend classique, 16 en weekend sprint**

### Système XP & Niveaux
- 35 missions dans 4 catégories (Assiduité, Performance, Social, Mini-jeux)
- Gains d'XP automatiques
- Progression de niveau

### Mini-Jeux
- Reaction Time (feux de départ F1)
- Batak Pro (rapidité) avec bouton DÉMARRER visible
- **Bouton "Partager dans une ligue"** après chaque partie
- **Boutons mode améliorés** (contraste Entraînement/Compétition)
- Modes: Entraînement (illimité), Compétition (3 essais/weekend)

### Classements
- Classement par ligue (weekend + général)
- Classement global de l'application
- Classement mini-jeux

### Administration
**4 onglets:**
- RÉSULTATS : Entrée des résultats officiels, **synchronisation automatique complète via APIs**
  - **Synchronisation automatisée** via Jolpica-F1 + OpenF1 APIs
  - Récupère automatiquement : Pole, Top 10 qualifs, Vainqueur, Top 10 course, Sprint
  - Récupère automatiquement : **Safety Car, DNF, Meilleur tour, Leader 1er virage**
  - **Tâche de synchronisation automatique toutes les heures**
- NOTIFS : Envoi de notifications à tous les membres (limite 5000 caractères)
- FEEDBACK : Visualisation des retours utilisateurs
- **MEMBRES** : Liste complète avec **compteur temps réel** (badge vert)
  - **Onglet Infos**: Niveau, XP, pronostics, ligues, performance
  - **Onglet Activité**: Historique des connexions (Date, IP, User-Agent)
  - **Bouton Supprimer le compte** avec confirmation

### Synchronisation Automatique des Résultats
- **Tâche de fond** : Vérifie automatiquement toutes les heures les courses terminées
- **Endpoints d'administration** :
  - `GET /api/admin/sync-status` : Voir l'état de toutes les courses
  - `POST /api/admin/sync-all-pending` : Forcer la synchronisation
  - `POST /api/admin/auto-sync-results/{race_id}` : Synchroniser une course spécifique

### Fiche Pilote Détaillée
- **URL** : `/driver/:driverId`
- **Photo officielle** du pilote en combinaison (CDN F1)
- **3 onglets** : Pilote, Palmarès, Infos
- **Bouton Comparer** : Ouvre le comparateur avec le pilote pré-sélectionné
- **API** : `GET /api/drivers/{driver_id}/details`

### Comparateur de Pilotes
- **URL** : `/compare` ou `/compare?d1={driver1}&d2={driver2}`
- **Statistiques F1 comparées** avec barres visuelles colorées
- **Section Efficacité** : Taux de victoire, podium, pole et points/course
- **API** : `GET /api/drivers/compare?driver1={id}&driver2={id}`

## Architecture technique

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Fichier monolithique (~4100 lignes) **⚠️ REFACTORING NÉCESSAIRE**
- `/app/backend/drivers_data.py` - Données statiques des pilotes

### Frontend (React + TailwindCSS)
- `/app/frontend/src/pages/DashboardPage.jsx` - Dashboard avec slider et badge chat
- `/app/frontend/src/pages/PredictionsPage.jsx` - Onglets Sprint/Course
- `/app/frontend/src/pages/AdminPage.jsx` - 4 onglets, gestion membres
- `/app/frontend/src/pages/LeaderboardPage.jsx` - Classement de ligue
- `/app/frontend/src/pages/ChampionshipPage.jsx` - Classements F1 temps réel
- `/app/frontend/src/pages/DriverDetailPage.jsx` - Fiche pilote
- `/app/frontend/src/pages/DriverComparisonPage.jsx` - Comparateur

### Collections MongoDB
- users, leagues, races, drivers
- predictions, custom_predictions
- missions, user_achievements
- minigame_scores, notifications, feedback
- **leaderboard** (classements par ligue)
- **user_sessions** (historique connexions)
- **chat_read_status**

## Prochaines étapes (Backlog)

### P0 - Priorité critique
- **Correctifs de sécurité Phase 1** : JWT_SECRET via env, CORS strict, validation mot de passe

### P1 - Priorité haute
- Fonctionnalité "Mot de passe oublié" via Resend (⏳ En attente clé API)
- Images de fond dynamiques pour chaque GP

### P2 - Améliorations futures
- **Refactoring backend** : Diviser `server.py` en routes, modèles, services
- Animations d'entrée sur les cartes
- Badges visuels pour missions accomplies
- Bonus de série (streak) pour pronostics consécutifs

### P3 - Nice to have
- Notifications push
- Mode sombre/clair toggle
- Statistiques détaillées de performance

## Tests validés (04/04/2026)
- **Audit système de points** : COMPLET ET VALIDÉ
  - Backend : `calculate_points()`, endpoints leaderboard - OK
  - Mise à jour dynamique : Points 0 → 42 avec last_race 18 - OK
  - Classement global : Tri correct par points - OK
  - Frontend : Affichage cohérent sur toutes les pages - OK

## Notes techniques
- Les images de fond GP sont stockées comme URLs
- L'API OpenF1 est utilisée pour récupérer les résultats officiels
- `server.py` ~4100 lignes - **refactoring Phase 1 complétée (04/04/2026)**

## Refactoring Backend (Phase 2 - Complétée 04/04/2026)

### Modules créés et fonctionnels :
```
/app/backend/
├── config.py              # DB + JWT + constantes ✓
├── models/schemas.py      # Tous les Pydantic models ✓
├── data/f1_data.py        # F1_DRIVERS_2026, F1_RACES_2026 ✓
├── services/
│   ├── auth.py            # Auth utilities ✓
│   └── scoring.py         # calculate_points() ✓
├── routes/
│   ├── auth.py            # /auth/* ✓
│   ├── leagues.py         # /leagues/* ✓ (350 lignes)
│   ├── predictions.py     # /predictions/* ✓ (400 lignes)
│   ├── races.py           # /races/*, /drivers/* ✓ (250 lignes)
│   └── minigames.py       # /minigames/* ✓ (200 lignes)
└── REFACTORING_GUIDE.md   # Documentation migration ✓
```

### Modules restants (dans server.py) :
- routes/admin.py (~800 lignes) - Sync, membres admin, feedback
- routes/user.py (~400 lignes) - Profil, avatars, missions
- services/sync.py - Auto-sync scheduler

### Prochaine étape :
Intégrer les routeurs extraits dans server.py pour réduire la taille du fichier principal de ~4100 à ~2000 lignes.
