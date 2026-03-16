# PRONOKIF - PRD (Product Requirements Document)

## Vision du produit
PRONOKIF est une application de jeu de pronostics sur la Formule 1, permettant aux utilisateurs de s'inscrire, rejoindre ou créer des ligues, et de faire des pronostics sur les courses.

## Design
**Thème:** Arcade Gaming F1
- Fond bleu sombre profond (#050a14 à #0a1628)
- Éléments métalliques chrome
- Accents cyan néon (#22d3ee) et or (#fbbf24)
- Bandes kerb rouge/blanc comme séparateurs
- Hero banner avec voiture F1 rouge et logo PRONOKIF doré 3D

**Assets générés:**
- Hero Banner: https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/d9b6f1a65194f54bbc34bb7e15e4af8069ab64dab312c6c3be1db79b2ca45259.png
- Chrome Frame: https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/78b5c3494748180c023e9ae942169b78c5557b0a28dc2e7d6dc99087ca8dfa6e.png
- Monaco GP Background: https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png
- Dark Panel Texture: https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/b7b92423aa24dd25313c4414c9091052d3cc5c5cf546f50f6162caf6a5bc3a20.png

## Fonctionnalités implémentées

### Authentification
- Inscription/Connexion par email
- JWT tokens
- Gestion du profil utilisateur

### Ligues
- Création de ligue avec code d'invitation
- Rejoindre une ligue existante
- Gestion multi-ligues

### Pronostics de Course - SYSTÈME SÉPARÉ (Mis à jour 16/03/2026)
**Nouveaux endpoints séparés:**
- `POST /api/predictions/sprint` - Pronostics sprint uniquement
- `POST /api/predictions/main` - Pronostics course principale uniquement

**Weekend Sprint (dates limites distinctes):**
- Sprint: Clôture 15 min avant SQ1 (qualifications sprint)
- Course: Clôture 15 min avant Q1 (qualifications principales)

**Interface à onglets:**
- Onglet "Sprint" : Pole SQ, Top 10 SQ, Vainqueur Sprint, Top 10 Sprint, Bonus Sprint
- Onglet "Course" : Pole Q, Top 10 Q, Vainqueur Course, Top 10 Course, Bonus Course

**Weekend Classique:**
- Pole Position (1 pilote)
- Top 10 Qualifications
- Vainqueur Course Principale
- Top 10 Course Principale
- Bonus: Safety Car, DNF (multi), Meilleur tour, Leader 1er virage

### Pronostics Personnalisés
- Création de questions personnalisées par les membres
- Types: Oui/Non, Choix multiples, Texte libre
- Attribution des réponses correctes par le créateur

### Système XP & Niveaux
- 35 missions dans 4 catégories (Assiduité, Performance, Social, Mini-jeux)
- Gains d'XP automatiques
- Progression de niveau

### Avatars Personnalisés
- 45 avatars prédéfinis (classiques, écuries, pilotes)
- Upload de photo personnelle

### Mini-Jeux (Mis à jour 16/03/2026)
- Reaction Time (feux de départ F1)
- Batak Pro (rapidité) - **BOUTON DÉMARRER CORRIGÉ**
- **NOUVEAU: Bouton "Partager dans une ligue"** après chaque partie
  - Permet de partager son score dans le chat d'une ligue
  - Modal de sélection de ligue
  - Message automatique avec score et commentaire
- Modes: Entraînement (illimité), Compétition (3 essais/weekend)
- Classements dédiés par jeu
- +2 points bonus pour le vainqueur de chaque jeu

### Classements
- Classement par ligue (weekend + général)
- Classement global de l'application
- Classement mini-jeux

### Administration (Mis à jour 16/03/2026)
**4 onglets:**
- RÉSULTATS : Entrée des résultats officiels, synchronisation OpenF1
- NOTIFS : Envoi de notifications à tous les membres
- FEEDBACK : Visualisation des retours utilisateurs
- **MEMBRES (NOUVEAU)** : Liste de tous les utilisateurs inscrits avec détails

**Endpoints admin membres:**
- `GET /api/admin/members` - Liste tous les utilisateurs
- `GET /api/admin/members/{id}` - Détails d'un utilisateur

**Admin:** Email `catalan.baptiste123@gmail.com`

### Design Arcade Gaming F1
- Toutes les pages utilisent le thème arcade cohérent
- Hero banner avec logo PRONOKIF et voiture F1
- Cartes avec bordures chrome/métalliques
- Countdown néon cyan
- Bandes kerb rouge/blanc
- Navigation chrome en bas

### Slider des Courses et Détails GP
- Carrousel permettant de naviguer entre les 8 prochaines courses
- Badge "SPRINT WEEKEND" pour les weekends sprint
- Page de Détails du Grand Prix avec infos circuit et programme
- Double compte à rebours pour weekends sprint

### Chat de Ligue et Profils Membres
- Chat de Ligue avec auto-refresh
- Profils des membres cliquables avec statistiques
- Bouton "+" pour ajouter une ligue

### Feedback Utilisateurs et Notifications Admin
- Modal feedback (Bug, Suggestion, Feedback)
- Icône cloche avec badge de notifications
- Panel admin pour gérer notifications et feedbacks

## Architecture technique

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Routes principales (~2500 lignes)
- `/app/backend/features.py` - Missions, avatars, mini-jeux

### Frontend (React + TailwindCSS)
- `/app/frontend/src/index.css` - Thème arcade global
- `/app/frontend/src/pages/DashboardPage.jsx` - Dashboard avec slider
- `/app/frontend/src/pages/PredictionsPage.jsx` - **Refonte avec onglets Sprint/Course**
- `/app/frontend/src/pages/AdminPage.jsx` - **4 onglets dont MEMBRES**
- `/app/frontend/src/components/MiniGames.jsx` - Jeux Reaction et Batak

### Collections MongoDB
- users, leagues, races, drivers
- predictions, custom_predictions
- missions, user_achievements
- minigame_scores, notifications, feedback

## Prochaines étapes (Backlog)

### P1 - Priorité haute
- Générer des images de fond pour chaque GP (Silverstone, Spa, Monza, etc.)
- Système de fonds GP dynamiques selon le calendrier

### P2 - Améliorations futures
- Animations d'entrée sur les cartes
- Notifications push
- Badges visuels pour missions accomplies
- Historique détaillé des points
- Bonus de série (streak) pour pronostics consécutifs

### P3 - Nice to have
- Mode sombre/clair toggle
- Statistiques détaillées de performance
- Comparaison avec les amis
- Partage sur réseaux sociaux

## Notes techniques
- Les images de fond GP sont stockées comme URLs
- L'API OpenF1 est utilisée pour récupérer les résultats officiels
- Bug MongoDB ObjectId corrigé dans les endpoints de prédiction (16/03/2026)
- `server.py` dépasse 2500 lignes - envisager refactoring en modules

## Tests validés (16/03/2026)
- Backend: 16/16 tests passés (iteration_8)
- Frontend: 100% validé
- Bug MongoDB ObjectId: Corrigé et testé
