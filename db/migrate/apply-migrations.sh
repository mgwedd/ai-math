#!/bin/sh
# LOCAL DOCKER ONLY: one-shot `migrate` service.
# Applies the repo's supabase/migrations (mounted at /migrations) in filename
# order. Runs AFTER GoTrue (the `auth` service) is healthy, so `auth.users`
# already exists and the app migrations' FKs / triggers resolve.
#
# Idempotency is tracked with a real ledger: public.schema_migrations records
# every applied file by name. Each migration and its ledger insert run in ONE
# transaction (--single-transaction + ON_ERROR_STOP), so a failure rolls back
# BOTH — the version is never recorded for a migration that didn't fully apply,
# and a re-run retries it. A fully-applied DB is a no-op on re-run. Exits
# non-zero on any SQL error so compose surfaces a failed bring-up instead of a
# silently half-migrated database.
set -e

export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL="psql -v ON_ERROR_STOP=1 -h db -U $POSTGRES_USER -d $POSTGRES_DB"

# Applied-migrations ledger. Created up front so the first run has somewhere to
# record versions; harmless on re-runs.
$PSQL -c "CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)"

applied=0
for f in /migrations/*.sql; do
  # Guard against the literal glob when the directory has no .sql files.
  [ -e "$f" ] || continue
  version=$(basename "$f")

  if [ "$($PSQL -tAc "SELECT 1 FROM public.schema_migrations WHERE version = '$version'")" = "1" ]; then
    echo "migrate: $version already applied, skipping"
    continue
  fi

  echo "migrate: applying $version"
  # File + ledger insert in a single transaction: if the file errors, the whole
  # transaction rolls back and the version is NOT recorded, so a re-run retries.
  $PSQL --single-transaction -f "$f" \
    -c "INSERT INTO public.schema_migrations (version) VALUES ('$version')"
  applied=$((applied + 1))
done

echo "migrate: done ($applied applied)"
