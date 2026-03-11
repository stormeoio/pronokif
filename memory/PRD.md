# Paddock Predictor - PRD

## Problème Original
Application de pronostics F1 entre amis avec :
- Inscription rapide (email/mot de passe + pseudo)
- Créer/rejoindre une ligue avec code d'invitation
- Faire des pronostics (Qualifications: poleman + Top 3, Course: vainqueur + Top 3)
- Tableau de bord avec prochain GP, classement ligue, position utilisateur
- Système de points après chaque course
- Notifications in-app
- Partage code d'invitation (WhatsApp, copier lien)

## User Personas
1. **Fan F1 Casual** - Suit les courses le week-end, veut s'amuser avec ses amis
2. **Passionné F1** - Connaît tous les pilotes, veut prouver ses connaissances
3. **Compétiteur Social** - Motivé par le classement et battre ses amis

## Architecture Technique

### Backend (FastAPI + MongoDB)
- **Auth**: JWT avec bcrypt pour le hashing
- **Modèles**: Users, Leagues, Predictions, Leaderboard
- **Données F1**: Liste statique saison 2026 (20 pilotes, 24 courses)
- **Scoring**: Points pour pole exacte (5), top 3 exact (3/5), top 3 présent (1/2)

### Frontend (React + Tailwind)
- **Theme**: "Midnight Telemetry" - Gaming sombre avec accents rouges
- **Typography**: Racing Sans One (titres), Chivo (corps), JetBrains Mono (données)
- **Components**: shadcn/ui + effets glow personnalisés

## Fonctionnalités Implémentées ✅
- [x] Authentification JWT (inscription/connexion)
- [x] Choix du pseudo (première connexion)
- [x] Création de ligue avec code unique
- [x] Rejoindre une ligue avec code
- [x] Dashboard avec prochain GP + countdown
- [x] Page pronostics (4 étapes: pole, top3 quali, vainqueur, top3 course)
- [x] Classement ligue avec évolution de position
- [x] Profil utilisateur avec stats
- [x] Partage code invitation (Web Share API / WhatsApp)
- [x] Navigation mobile (bottom nav)
- [x] Design gaming F1 complet

## Backlog Priorisé

### P0 (Critique)
- [ ] Endpoint admin pour entrer les résultats réels
- [ ] Calcul automatique des points après course

### P1 (Important)
- [ ] Notifications in-app (rappel avant clôture)
- [ ] Page résultats avec comparaison pronostics/réel
- [ ] Historique des courses passées

### P2 (Nice to have)
- [ ] Intégration API F1 temps réel (OpenF1)
- [ ] Avatars personnalisés
- [ ] Badges/achievements
- [ ] Mode multi-ligues actif

## Prochaines Étapes
1. Créer interface admin pour entrer résultats
2. Tester calcul de points avec données réelles
3. Ajouter notifications avant clôture pronostics

---
*Dernière mise à jour: Mars 2026*
