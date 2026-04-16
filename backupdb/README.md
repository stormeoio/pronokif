# PRONOKIF - MongoDB Backup

## Backup Info
- **Date**: 2026-04-16
- **Database**: test_database
- **Format**: JSON (MongoDB native format)

## Collections Exported

| Collection | Description |
|------------|-------------|
| users.json | Tous les utilisateurs (80+) |
| leagues.json | Toutes les ligues (36+) |
| leaderboard.json | Classements par ligue (41+) |
| predictions.json | Pronostics des utilisateurs |
| race_results.json | Résultats des courses |
| user_stats.json | Statistiques utilisateurs |
| user_sessions.json | Historique des connexions |
| notifications.json | Notifications système |
| feedback.json | Retours utilisateurs |
| league_messages.json | Messages de chat des ligues |
| chat_read_status.json | Statut de lecture du chat |
| minigame_results.json | Scores des mini-jeux |
| custom_predictions.json | Pronostics personnalisés |

## How to Restore

```bash
# Option 1: Using the restore script
chmod +x restore.sh
./restore.sh mongodb://localhost:27017 pronokif_db

# Option 2: Manual import (one collection)
mongoimport --uri="mongodb://localhost:27017" \
  --db="pronokif_db" \
  --collection="users" \
  --file="users.json" \
  --jsonArray --drop
```

## Note
MongoDB is a NoSQL database - it uses JSON/BSON format, not SQL.
These JSON files can be directly imported into any MongoDB instance.
