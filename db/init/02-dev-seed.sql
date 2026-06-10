-- LOCAL DOCKER ONLY: seed the fixed dev identity the DEV_AUTH bypass uses.
-- Runs after migrations (lexical order), so the profile trigger fires.
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-4000-8000-000000001337', 'dev@astrealabs.com')
ON CONFLICT (id) DO NOTHING;
