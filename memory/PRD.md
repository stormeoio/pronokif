# PRONOKIF - PRD

## Problème Original
Application de pronostics F1 entre amis avec design gaming arcade.

## Choix Utilisateur
- Nom: **PRONOKIF**
- Design: Gaming arcade (inspiré image fournie - métallique, néon orange/cyan)
- Auth: JWT
- Données F1: Statiques (saison 2026)
- Notifications: In-app
- Paris bonus: Safety Car, DNF, Fastest Lap

## Architecture Technique

### Backend (FastAPI + MongoDB)
- **Auth**: JWT + bcrypt + système XP/Niveau
- **Modèles**: Users, Leagues, Predictions, Leaderboard, Notifications, RaceResults
- **Données F1**: 20 pilotes, 24 courses (saison 2026)
- **Scoring**: Pole(5), Top3 exact(3/5), Winner(10), Bonus(+2 à +5)

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
- [x] Page pronostics 5 étapes (Pole, Top3 Qualif, Winner, Top3 Course, Bonus)
- [x] Paris bonus: Safety Car (+3), DNF (+2), Fastest Lap (+5)
- [x] Countdown jusqu'à clôture
- [x] Verrouillage automatique

### Admin & Points
- [x] **Interface Admin** pour entrer résultats officiels (/admin)
- [x] **Calcul automatique des points** après saisie résultats
- [x] Mise à jour XP + Level up automatique
- [x] Mise à jour classement ligue

### Notifications
- [x] **Page notifications** (/notifications)
- [x] **Badge non-lus** dans navigation
- [x] Notifications: résultats disponibles, level up
- [x] Endpoint rappel 24h avant clôture

### Design Gaming
- [x] Logo PRONOKIF avec effet métallique
- [x] Countdown cyberpunk bleu cyan
- [x] Boutons avec glow orange
- [x] Cards avec bordures néon
- [x] Navigation gaming avec effets

## Système de Points

| Action | Points |
|--------|--------|
| Pole exacte | +5 |
| Top 3 Qualif exact | +3 |
| Top 3 Qualif présent | +1 |
| Vainqueur exact | +10 |
| Top 3 Course exact | +5 |
| Top 3 Course présent | +2 |
| Safety Car correct | +3 |
| DNF correct | +2 |
| Fastest Lap exact | +5 |

## Backlog Restant

### P1 (Nice to have)
- [ ] Intégration API F1 temps réel
- [ ] Avatars personnalisés
- [ ] Badges/achievements
- [ ] Cron job pour envoyer rappels auto

---
*Dernière mise à jour: Mars 2026 - v2.0 avec Admin, Points, Notifications*
