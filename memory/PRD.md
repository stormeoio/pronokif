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
- Hero Banner: https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/d71e4f8baaf09d0a9c181630097e14820689ebaae4e8d85396944b8e628c816c.png
- Chrome Frame: https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/78b5c3494748180c023e9ae942169b78c5557b0a28dc2e7d6dc99087ca8dfa6e.png
- Monaco GP Background: https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png
- Dark Panel Texture: https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/b7b92423aa24dd25313c4414c9091052d3cc5c5cf546f50f6162caf6a5bc3a20.png

## Fonctionnalités implémentées

### ✅ Authentification
- Inscription/Connexion par email
- JWT tokens
- Gestion du profil utilisateur

### ✅ Ligues
- Création de ligue avec code d'invitation
- Rejoindre une ligue existante
- Gestion multi-ligues

### ✅ Pronostics de Course
- Pole Position (1 pilote)
- Top 10 Qualifications
- Top 10 Course Sprint (weekends sprint)
- Vainqueur Course Sprint
- Vainqueur Course Principale
- Top 10 Course Principale
- Bonus: Safety Car, DNF (multi), Meilleur tour, Leader 1er virage
- **Calendrier complet** : Accès à tous les GP pour pronostiquer en avance
- **Clôture 15 min avant FP1** : Les pronos sont modifiables jusqu'à 15 minutes avant le début des essais libres

### ✅ Pronostics Personnalisés
- Création de questions personnalisées par les membres
- Types: Oui/Non, Choix multiples, Texte libre
- Attribution des réponses correctes par le créateur

### ✅ Système XP & Niveaux
- 35 missions dans 4 catégories (Assiduité, Performance, Social, Mini-jeux)
- Gains d'XP automatiques
- Progression de niveau

### ✅ Avatars Personnalisés
- 45 avatars prédéfinis (classiques, écuries, pilotes)
- Upload de photo personnelle

### ✅ Mini-Jeux
- Reaction Time (feux de départ F1)
- Batak Pro (rapidité)
- Modes: Entraînement (illimité), Compétition (3 essais/weekend)
- Classements dédiés par jeu
- +2 points bonus pour le vainqueur de chaque jeu

### ✅ Classements
- Classement par ligue (weekend + général)
- Classement global de l'application
- Classement mini-jeux

### ✅ Administration
- Interface pour entrer les résultats officiels
- Synchronisation avec API OpenF1
- Calcul automatique des points

### ✅ Design Arcade Gaming F1
- Toutes les pages utilisent le thème arcade cohérent
- Hero banner avec logo PRONOKIF et voiture F1
- Cartes avec bordures chrome/métalliques
- Countdown néon cyan
- Bandes kerb rouge/blanc
- Navigation chrome en bas

### ✅ Slider des Courses et Détails GP (Ajouté le 16/03/2026)
- **Slider sur le Dashboard** : Carrousel permettant de naviguer entre les 8 prochaines courses
  - Navigation par boutons gauche/droite et points de pagination
  - Affiche le nom du GP, circuit, date et compte à rebours
  - Badge "SPRINT WEEKEND" pour les weekends sprint
  - Indicateur de pronos enregistrés/non enregistrés
- **Page de Détails du Grand Prix** (`/race/:raceId`)
  - Informations du circuit : nom complet, longueur (km), nombre de virages, nombre de tours
  - Programme du weekend avec toutes les sessions (FP1, FP2/SQ, FP3/Sprint, Quali, Course)
  - Horaires en heure française
  - Bouton "FAIRE MES PRONOS" ou "Voir les résultats"
- **API** : `GET /api/races/{race_id}/details` - Retourne les infos complètes du circuit et le programme des sessions

## Architecture technique

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Routes principales, F1_CIRCUITS data, F1_RACES_2026 calendar
- `/app/backend/features.py` - Missions, avatars, mini-jeux

### Frontend (React + TailwindCSS)
- `/app/frontend/src/index.css` - Thème arcade global
- `/app/frontend/src/pages/DashboardPage.jsx` - Dashboard avec slider des courses
- `/app/frontend/src/pages/GrandPrixDetailPage.jsx` - Page de détails du GP
- `/app/frontend/src/pages/RaceCalendarPage.jsx` - Calendrier complet
- `/app/frontend/src/pages/` - Autres pages de l'application
- `/app/frontend/src/components/` - Composants réutilisables

### Collections MongoDB
- users, leagues, races, drivers
- predictions, custom_predictions
- missions, user_achievements
- minigame_scores, notifications

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
- Les images de fond GP sont stockées comme URLs et peuvent être modifiées par GP
- Le système est prêt pour supporter plusieurs fonds GP via `GP_BACKGROUNDS` dans DashboardPage.jsx
- L'API OpenF1 est utilisée pour récupérer les résultats officiels
