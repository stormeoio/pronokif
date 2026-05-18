#!/usr/bin/env bash
# PRONOKIF - MongoDB Backup Script
#
# Usage:
#   ./scripts/backup-mongo.sh                     # local dev (default)
#   MONGO_URL=mongodb://... ./scripts/backup-mongo.sh  # production
#
# Outputs:
#   backups/pronokif_YYYY-MM-DD_HHMMSS.gz
#
# Cron example (daily at 3:00 AM):
#   0 3 * * * cd /path/to/Pronokif && ./scripts/backup-mongo.sh >> /var/log/pronokif-backup.log 2>&1
#
# Retention: keeps the last 14 backups, deletes older ones.

set -euo pipefail

MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
DB_NAME="${DB_NAME:-pronokif}"
BACKUP_DIR="$(dirname "$0")/../backups"
RETENTION_COUNT=14

# Create backup directory
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
FILENAME="pronokif_${TIMESTAMP}.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "[$(date -Iseconds)] Starting backup of ${DB_NAME}..."

# Use mongodump with gzip compression
if command -v mongodump &>/dev/null; then
    mongodump \
        --uri="$MONGO_URL" \
        --db="$DB_NAME" \
        --archive="$FILEPATH" \
        --gzip \
        --quiet
else
    echo "[ERROR] mongodump not found. Install mongodb-database-tools."
    exit 1
fi

SIZE=$(du -h "$FILEPATH" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${FILENAME} (${SIZE})"

# Retention: keep only the last N backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "pronokif_*.gz" -type f | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt "$RETENTION_COUNT" ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - RETENTION_COUNT))
    echo "[$(date -Iseconds)] Removing ${REMOVE_COUNT} old backup(s)..."
    find "$BACKUP_DIR" -name "pronokif_*.gz" -type f -printf '%T+ %p\n' \
        | sort | head -n "$REMOVE_COUNT" | cut -d' ' -f2- \
        | xargs rm -f
fi

echo "[$(date -Iseconds)] Done. ${BACKUP_COUNT} backup(s) in ${BACKUP_DIR}."
