#!/bin/sh
# LOCAL DOCKER ONLY: one-shot `migrate` service.
# Applies the repo's supabase/migrations (mounted at /migrations) in filename
# order. Runs AFTER GoTrue (the `auth` service) is healthy, so `auth.users`
# already exists and the app migrations' FKs / triggers resolve. Idempotent
# enough for a fresh volume; exits non-zero on any SQL error so compose surfaces
# a failed bring-up instead of a silently half-migrated database.
set -e

export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL="psql -v ON_ERROR_STOP=1 -h db -U $POSTGRES_USER -d $POSTGRES_DB"

# The `progress` etc. tables are created only once; if they already exist (a
# re-run against a populated volume), skip re-applying to avoid "already exists".
if $PSQL -tAc "SELECT to_regclass('public.progress')" | grep -q progress; then
  echo "migrate: schema already present, skipping migrations"
  exit 0
fi

for f in /migrations/*.sql; do
  echo "migrate: applying $f"
  $PSQL -f "$f"
done
echo "migrate: done"
