---
trigger: glob
globs: "supabase/**/*.sql, init.sql, src/app/actions/**/*.ts, src/lib/supabase/**/*.ts"
---

# Database & Supabase rules

- **Migrations are append-only.** Never edit an applied migration (001–008). New change = new file
  `supabase/migrations/YYYYMMDDHHMMSS_short_name.sql`, wrapped in `BEGIN; … COMMIT;`, idempotent where possible (`IF EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT`).
- After adding a migration, regenerate `init.sql` (all migrations in order) and tell the user to run ONLY the new file in the Supabase SQL Editor. Production is never changed by the agent.
- New table checklist: RLS enabled, SELECT/INSERT/UPDATE policies per role, `GRANT … TO authenticated` (this project does not auto-grant), FKs with explicit `ON DELETE`, indexes on FK + filter columns, `created_at timestamptz default now()`.
- State/ownership transitions → a `SECURITY DEFINER` function with `SET search_path = public`, row locks (`FOR UPDATE`), caller check, explicit error codes, an `activity_events` row, and notifications via `public._notify` (idempotency key). `REVOKE … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated`.
- In policies, qualify columns inside sub-selects (`files.task_id`, `deliverables.id`) — an unqualified `id` silently binds to the inner table.
- PostgREST embeds between `deliverables` and `deliverable_versions` are ambiguous (two FKs): always use `!deliverable_versions_deliverable_id_fkey`.
- Archive, never delete (`status = 'archived'`). No `ON DELETE CASCADE` on anything with history.
- Every change to RLS needs a negative test: the wrong role/team/client must get 0 rows or an error. Use the `rls-check` skill.
