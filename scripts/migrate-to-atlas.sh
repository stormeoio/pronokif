#!/usr/bin/env bash
# ============================================================
# Migrate local MongoDB → Atlas
# Usage: ./scripts/migrate-to-atlas.sh <atlas-connection-string>
#
# Prerequisites:
#   - mongodump/mongorestore installed (brew install mongodb-database-tools)
#   - Local MongoDB running on localhost:27017
#   - Atlas cluster created with network access configured
# ============================================================

set -euo pipefail

ATLAS_URI="${1:?Usage: $0 <mongodb+srv://user:pass@cluster.xxx.mongodb.net>}"
LOCAL_URI="mongodb://localhost:27017"
DB_NAME="pronokif"
DUMP_DIR="/tmp/pronokif-dump-$(date +%Y%m%d_%H%M%S)"

echo "=== Step 1: Dump local database ==="
mongodump --uri="$LOCAL_URI" --db="$DB_NAME" --out="$DUMP_DIR"
echo "Dumped to $DUMP_DIR"

echo ""
echo "=== Step 2: Restore to Atlas ==="
mongorestore --uri="$ATLAS_URI" --db="$DB_NAME" "$DUMP_DIR/$DB_NAME" --drop
echo "Restored to Atlas"

echo ""
echo "=== Step 3: Verify ==="
mongosh "$ATLAS_URI/$DB_NAME" --eval "
  const collections = db.getCollectionNames();
  print('Collections: ' + collections.length);
  collections.forEach(c => {
    const count = db[c].countDocuments();
    print('  ' + c + ': ' + count + ' docs');
  });
"

echo ""
echo "=== Done! ==="
echo "Update your .env with:"
echo "  MONGO_URL=$ATLAS_URI"
echo ""
echo "Clean up dump: rm -rf $DUMP_DIR"
