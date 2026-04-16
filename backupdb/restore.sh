#!/bin/bash
# PRONOKIF - MongoDB Restore Script
# Usage: ./restore.sh [MONGO_URL] [DB_NAME]

MONGO_URL=${1:-"mongodb://localhost:27017"}
DB_NAME=${2:-"test_database"}
BACKUP_DIR="$(dirname "$0")"

echo "=== PRONOKIF MongoDB Restore ==="
echo "Target: $MONGO_URL / $DB_NAME"
echo ""

collections=(
  "users"
  "leagues"
  "leaderboard"
  "predictions"
  "race_results"
  "user_stats"
  "user_sessions"
  "notifications"
  "feedback"
  "league_messages"
  "chat_read_status"
  "minigame_results"
  "custom_predictions"
)

for coll in "${collections[@]}"; do
  if [ -f "$BACKUP_DIR/${coll}.json" ]; then
    echo "  Restoring $coll..."
    mongoimport --uri="$MONGO_URL" --db="$DB_NAME" --collection="$coll" --file="$BACKUP_DIR/${coll}.json" --jsonArray --drop
  fi
done

echo ""
echo "=== Restore Complete ==="
