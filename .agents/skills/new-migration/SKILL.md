---
name: new-migration
description: Create a new Supabase SQL migration safely (append-only, RLS, grants, RPC pattern) and regenerate init.sql. Use whenever a change needs a table, column, policy, function, trigger or grant, or when the user types /new-migration.
---

# New migration

1. **Find the next number.** `ls supabase/migrations` — use the next timestamp-style name: `YYYYMMDDHHMMSS_short_snake_name.sql`. Never edit an existing migration.
2. **Read what exists** for every table you touch: its `CREATE TABLE`, current policies and functions across all migrations (`grep -n "table_name" supabase/migrations/*.sql`).
3. **Write the file**:
   - `BEGIN;` … `COMMIT;`
   - Idempotent: `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`.
   - New table → `ENABLE ROW LEVEL SECURITY`, policies per role, `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated`, indexes on FKs and filter columns.
   - State/ownership change → `SECURITY DEFINER SET search_path = public` function: lock rows `FOR UPDATE`, check the caller (`is_admin()`, `is_team_manager()`, `is_client_member()`, owner/reviewer), `RAISE EXCEPTION 'UPPER_SNAKE_CODE'` on refusal, insert into `activity_events`, notify via `public._notify(..., idempotency_key)`, then `REVOKE ALL … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated`.
   - Qualify columns inside policy sub-selects.
4. **Add every new error code** to `MESSAGES` in `src/lib/labels.ts` with a short Arabic message.
5. **Regenerate init.sql**:
   ```bash
   { echo "-- init.sql — ALL migrations in order, for a FRESH, EMPTY database only."; for f in supabase/migrations/*.sql; do echo; echo "-- ════════ $(basename "$f") ════════"; cat "$f"; done; } > init.sql
   ```
6. **Test** with the `rls-check` skill if policies or functions changed.
7. **Hand-off to the user** (don't run it on production yourself): "شغّل الملف `<name>.sql` بس في Supabase → SQL Editor → Run". Mention any data impact.
