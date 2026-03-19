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
- **Historique de connexion** avec IP et User-Agent (Ajouté 17/03/2026)

### Ligues
- Création de ligue avec code d'invitation
- Rejoindre une ligue existante
- Chat de ligue avec notifications de messages non lus
- **Modification nom et description par le créateur** (Ajouté 17/03/2026)
- **Page de détails de ligue** avec classement et membres
- **Quitter une ligue** - Chaque membre peut quitter une ligue (Ajouté 17/03/2026)
- **Partage avec lien cliquable** - Bouton de partage génère un lien `/join/{code}` (Ajouté 17/03/2026)
- **Page d'invitation** - `/join/:code` affiche une prévisualisation de la ligue avant de rejoindre
- **Supprimer une ligue** - Le créateur peut supprimer sa ligue (avec confirmation) (Ajouté 17/03/2026)
- **Transférer la propriété** - Le créateur peut désigner un nouveau propriétaire parmi les membres (Ajouté 17/03/2026)

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

### Pronos Personnalisés (Mis à jour 17/03/2026)
- Sélecteur de GP pour choisir la course cible
- Création de questions personnalisées par les membres
- Types: Oui/Non, Choix multiples, Texte libre

### Comptage des Pronostics (Mis à jour 17/03/2026)
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

### Administration (Mis à jour 17/03/2026)
**4 onglets:**
- RÉSULTATS : Entrée des résultats officiels, **synchronisation automatique complète via APIs**
  - **Synchronisation automatisée** via Jolpica-F1 + OpenF1 APIs (AMÉLIORÉ)
  - Récupère automatiquement : Pole, Top 10 qualifs, Vainqueur, Top 10 course, Sprint
  - Récupère automatiquement : **Safety Car, DNF, Meilleur tour, Leader 1er virage**
  - Boutons bonus améliorés (Meilleur Tour, Leader 1er Virage avec bordures colorées)
  - Safety Car avec état visible (✓ OUI / ✗ NON)
- NOTIFS : Envoi de notifications à tous les membres (limite 5000 caractères)
- FEEDBACK : Visualisation des retours utilisateurs
- **MEMBRES** : Liste complète avec **compteur temps réel** (badge vert)
  - **Onglet Infos**: Niveau, XP, pronostics, ligues, performance
  - **Onglet Activité**: Historique des connexions (Date, IP, User-Agent)
  - **Bouton Supprimer le compte** avec confirmation

### Notifications Chat (Mis à jour 17/03/2026)
- Indicateur de messages non lus sur l'icône Accueil (navigation)
- Badge sur le bouton Chat dans le dashboard
- Marquage automatique comme lu à l'ouverture du chat
- Endpoints: `/api/leagues/unread-messages`, `/api/leagues/{id}/messages/read`

### Navigation améliorée (Mis à jour 18/03/2026)
- **Menu hamburger** sur le Dashboard avec pages statiques
- **Onglet "Ligues"** remplace "Notifs" dans la barre de navigation
- **Onglet "Championnat"** remplace "Classement" dans la barre de navigation
- **Onglet "Mini-jeux"** remplace "Profil" dans la barre de navigation (NOUVEAU 18/03/2026)
- **Cloche simplifiée** vers /notifications directement
- **Bannière profil compacte** en haut du dashboard, cliquable vers /profile (NOUVEAU 18/03/2026)

### Page Championnat F1 (Ajouté 17/03/2026)
- **Onglet Pilotes** : Classement en temps réel avec numéro, équipe, points et victoires
  - **Lignes cliquables** : Navigation vers la fiche pilote détaillée (NOUVEAU 19/03/2026)
- **Onglet Écuries** : Classement constructeurs avec nationalité et points
- **Onglet Résultats** (NOUVEAU) :
  - Sélecteur de Grand Prix (courses terminées uniquement)
  - Sous-onglets : Course, Qualifications, Sprint (si applicable), Essais, Bonus
  - Classement Course : Top 10 avec points et temps
  - Classement Qualifications : Top 10 avec temps Q3/Q2/Q1
  - Classement Sprint : Top 10 avec points
  - Essais Libres : FP1, FP2, FP3 avec meilleurs temps
  - Bonus : Meilleur tour en course, Leader au 1er virage
- Couleurs officielles des équipes F1
- Mise à jour automatique via API Jolpica-F1 + OpenF1 (gratuites, sans clé)

### Fiche Pilote Détaillée (NOUVEAU 19/03/2026)
- **URL** : `/driver/:driverId`
- **Photo officielle** du pilote en combinaison (CDN F1)
- **En-tête** : Photo circulaire avec bordure couleur équipe, badge pays, numéro, statistiques rapides
- **3 onglets** :
  - **Pilote** : Informations personnelles (nom, date/lieu naissance, taille, poids) + Contrat (équipe, dates, salaire estimé, notes) + Réseaux sociaux
  - **Palmarès** : Statistiques F1 (titres, victoires, podiums, poles, meilleurs tours, points) + Carrière junior (F2, F3, etc.)
  - **Infos** : 10 faits aléatoires et pertinents générés dynamiquement pour aider aux pronostics
- **Données des 22 pilotes** stockées dans `/app/backend/drivers_data.py`
- **API** : `GET /api/drivers/{driver_id}/details`

## Architecture technique

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Routes principales (~2850 lignes)
- `/app/backend/features.py` - Missions, avatars, mini-jeux

### Frontend (React + TailwindCSS)
- `/app/frontend/src/pages/DashboardPage.jsx` - Dashboard avec slider et badge chat
- `/app/frontend/src/pages/PredictionsPage.jsx` - Onglets Sprint/Course, bonus modifiables
- `/app/frontend/src/pages/AdminPage.jsx` - 4 onglets, gestion membres complète
- `/app/frontend/src/pages/CustomPredictionsPage.jsx` - Sélecteur GP
- `/app/frontend/src/pages/MiniGamesPage.jsx` - Boutons mode contrastés
- `/app/frontend/src/pages/LeagueDetailPage.jsx` - Détails de ligue (NOUVEAU)
- `/app/frontend/src/pages/LeaguePage.jsx` - Hub des ligues (REFAIT)
- `/app/frontend/src/pages/ProfilePage.jsx` - Historique des points
- `/app/frontend/src/pages/ChampionshipPage.jsx` - Classements F1 temps réel, lignes cliquables
- `/app/frontend/src/pages/DriverDetailPage.jsx` - Fiche pilote détaillée avec 3 onglets (NOUVEAU 19/03/2026)
- `/app/frontend/src/pages/JoinLeaguePage.jsx` - Page d'invitation (NOUVEAU)
- `/app/frontend/src/components/BottomNav.jsx` - Badge messages non lus
- `/app/frontend/src/components/HamburgerMenu.jsx` - Menu latéral (NOUVEAU)

### Collections MongoDB
- users, leagues, races, drivers
- predictions, custom_predictions
- missions, user_achievements
- minigame_scores, notifications, feedback
- **user_sessions** (historique connexions)
- **chat_read_status**

### Endpoints Admin (Ajoutés 17/03/2026)
- `GET /api/admin/members/{id}/activity` - Historique de connexion
- `DELETE /api/admin/members/{id}` - Suppression de compte

### Endpoints Ligues (Ajoutés 17/03/2026)
- `POST /api/leagues/{id}/leave` - Quitter une ligue
- `GET /api/leagues/by-code/{code}` - Récupérer les infos d'une ligue par son code (pour la page d'invitation)
- `DELETE /api/leagues/{id}` - Supprimer une ligue (créateur uniquement)
- `POST /api/leagues/{id}/transfer` - Transférer la propriété à un autre membre

### Endpoints Pilotes (NOUVEAU 19/03/2026)
- `GET /api/drivers/{driver_id}/details` - Retourne les données complètes d'un pilote (infos perso, contrat, palmarès, faits utiles, photo)
- `GET /api/drivers/all` - Liste tous les pilotes avec infos de base

## Prochaines étapes (Backlog)

### P1 - Priorité haute
- Générer des images de fond pour chaque GP (Silverstone, Spa, Monza, etc.)

### P2 - Améliorations futures
- Animations d'entrée sur les cartes
- Notifications push
- Badges visuels pour missions accomplies
- Bonus de série (streak) pour pronostics consécutifs

### P3 - Nice to have
- Mode sombre/clair toggle
- Statistiques détaillées de performance
- Partage sur réseaux sociaux

## Notes techniques
- Les images de fond GP sont stockées comme URLs
- L'API OpenF1 est utilisée pour récupérer les résultats officiels
- `server.py` ~2850 lignes - **refactoring fortement recommandé** pour séparer routes/modèles/services

## Tests validés (18/03/2026)
- API unread-messages: Fonctionnel
- API mark-read: Fonctionnel
- API admin/members: Comptage individuel des pronos
- **API admin/members/{id}/activity**: Fonctionnel avec IP/User-Agent
- **API DELETE admin/members/{id}**: Fonctionnel avec nettoyage complet
- **API leagues/{id}/leave**: Fonctionnel (supprime la ligue si seul membre)
- **API leagues/by-code/{code}**: Fonctionnel (endpoint public)
- **API admin/sync-results/{race_id}**: ENTIÈREMENT AUTOMATISÉ
  - Récupère: Pole, Top 10 qualifs, Vainqueur, Top 10 course, Meilleur tour
  - Récupère: Safety Car (OUI/NON), DNF (liste pilotes), Leader 1er virage
  - Récupère: Sprint (pole SQ, top10 SQ, winner sprint, top10 sprint)
- UI Admin bonus: Boutons visibles avec bordures colorées
- UI Admin Membres: Onglets Info/Activité, bouton suppression
- UI Mini-jeux: Contraste Entraînement/Compétition amélioré
- UI Pronos: Bonus modifiables après validation
- **UI League Detail**: Bouton partage (vert) + bouton quitter (rouge)
- **UI Join Page**: Page d'invitation avec prévisualisation de la ligue
- **Linting Python**: 0 erreurs (corrigé 17/03/2026)
- **UI Dashboard**: Nouvelle disposition avec bannière profil en haut (testé 18/03/2026)
- **UI BottomNav**: Onglet Mini-jeux fonctionnel (testé 18/03/2026)

## Tests validés (19/03/2026)
- **API drivers/{driver_id}/details**: 100% fonctionnel - 11 tests backend passés
  - Retourne données complètes pour les 22 pilotes
  - Photo URL depuis CDN F1 officiel
  - Génère 10 faits utiles aléatoires
  - Contient palmarès F1 + junior + contrat + réseaux sociaux
- **UI Fiche Pilote**: 100% fonctionnel
  - Navigation depuis ChampionshipPage
  - 3 onglets (Pilote, Palmarès, Infos) interactifs
  - Photo et couleur équipe affichées
  - Bouton retour vers Championnat
