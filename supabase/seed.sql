-- Demo data for LOCAL / STAGING only. Never run on production.
--
-- Old seed failed: it inserted profiles before their auth users existed
-- (FK error) and used a column that doesn't exist (projects.internal_manager_id).
--
-- How to use:
--   1. Create the 4 demo users in Supabase → Authentication → Users → "Add user"
--      with these emails (any password):
--        admin@massar.test, manager@massar.test, member@massar.test, client@massar.test
--   2. Run this file (SQL Editor, or `supabase db reset` locally).
--      It builds the org data and assigns roles by email. Safe to re-run.

INSERT INTO public.departments (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Creative')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teams (id, department_id, name) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Graphic Design')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clients (id, company_name) VALUES
  ('33333333-3333-3333-3333-333333333333', 'ABC Demo Client')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, client_id, name, internal_team_id, status) VALUES
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'October Campaign',
   '22222222-2222-2222-2222-222222222222', 'active')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_admin   UUID := (SELECT id FROM auth.users WHERE email = 'admin@massar.test');
  v_manager UUID := (SELECT id FROM auth.users WHERE email = 'manager@massar.test');
  v_member  UUID := (SELECT id FROM auth.users WHERE email = 'member@massar.test');
  v_client  UUID := (SELECT id FROM auth.users WHERE email = 'client@massar.test');
BEGIN
  IF v_admin IS NULL OR v_manager IS NULL OR v_member IS NULL OR v_client IS NULL THEN
    RAISE NOTICE 'Demo users missing — create them in Authentication first (see top of file). Org data was still inserted.';
    RETURN;
  END IF;

  UPDATE public.profiles SET role = 'admin',   full_name = 'Admin Demo',   team_id = NULL WHERE id = v_admin;
  UPDATE public.profiles SET role = 'manager', full_name = 'Manager Demo', team_id = '22222222-2222-2222-2222-222222222222' WHERE id = v_manager;
  UPDATE public.profiles SET role = 'member',  full_name = 'Member Demo',  team_id = '22222222-2222-2222-2222-222222222222' WHERE id = v_member;
  UPDATE public.profiles SET role = 'client',  full_name = 'Client Demo',  team_id = NULL WHERE id = v_client;

  UPDATE public.teams SET manager_user_id = v_manager WHERE id = '22222222-2222-2222-2222-222222222222';

  INSERT INTO public.client_memberships (client_id, user_id)
  VALUES ('33333333-3333-3333-3333-333333333333', v_client)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tasks (id, team_id, project_id, title, description, current_owner_user_id, original_owner_user_id, due_at)
  VALUES ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222',
          '44444444-4444-4444-4444-444444444444', 'Instagram Post #14', 'Demo task',
          v_member, v_member, now() + interval '3 hours')
  ON CONFLICT (id) DO NOTHING;
END $$;
