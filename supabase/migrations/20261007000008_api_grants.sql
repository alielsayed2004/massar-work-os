-- Migration 20261007000008_api_grants
--
-- This Supabase project does not auto-grant new public tables to the API
-- roles, so every query from the app failed with
-- "permission denied for table profiles" → the app saw no profile and
-- treated every account as inactive.
--
-- Table privileges only open the door; RLS (001–007) still decides which
-- ROWS each user can read or change. `anon` (logged-out) gets nothing.

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Helpers used inside RLS policies
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_member(UUID) TO authenticated;

-- Future tables created by migrations get the same treatment
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

COMMIT;
