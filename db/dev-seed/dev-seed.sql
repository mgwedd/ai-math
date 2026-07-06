-- LOCAL DOCKER ONLY: seed the fixed dev identity the DEV_AUTH bypass uses.
-- Only applied by the docker-compose.dev-auth.yml override (opt-in). GoTrue's
-- auth.users has extra NOT NULL columns; insert the minimum a bare identity
-- needs so the progress FK to auth.users(id) holds.
INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
VALUES (
  '00000000-0000-4000-8000-000000001337',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'dev@astrealabs.com', now(), now()
)
ON CONFLICT (id) DO NOTHING;
