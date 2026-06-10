#!/bin/sh
# LOCAL DOCKER ONLY: apply the repo's supabase migrations (mounted at
# /migrations) in filename order on first boot of a fresh volume.
set -e
for f in /migrations/*.sql; do
  echo "applying migration: $f"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done
