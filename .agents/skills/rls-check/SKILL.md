---
name: rls-check
description: Prove permissions are correct by running negative and positive tests as each role against Supabase. Use after changing RLS policies, SECURITY DEFINER functions, grants, or any server action that reads/writes data, or when the user types /rls-check.
---

# RLS check

Permissions are proven by trying to break them, not by reading the policy.

## How to impersonate a user (read-only checks are safe in the SQL Editor)
```sql
select set_config('request.jwt.claims',
  (select json_build_object('sub', id::text, 'role', 'authenticated')::text
   from auth.users where email = '<email>'), true);
set local role authenticated;
-- your query here
```
For writes, wrap in `begin; … rollback;` and never run destructive tests on production — use a local/staging project.

## Minimum matrix (from the addendum §5 + §2.7) — each must FAIL
- member: `update profiles set role='admin' where id=auth.uid()` → 0 rows
- member: update `tasks.current_owner_user_id` directly → 0 rows
- member: insert into `handover_requests` / `notifications` directly → RLS error
- member: approve own handover; second pending handover on same task
- manager of team B: decide team A's handover; assign to someone outside the team
- member: set `deliverable_versions.status` directly; share before internal approval; reviewer approves own version
- client: call `process_review_decision(..., 'internal', ...)`
- client A: read client B's versions/deliverables/files; read any task or activity
- anyone: insert a file into a non-draft version; decide on a non-current version

## Must SUCCEED
member → handover request → manager assigns (original owner kept, activity logged) → deliverable V1 → upload → submit → reviewer approves → share → client requests changes → V2 is a fresh draft.

## Report
A table: test | expected | actual. Any mismatch is a blocker — fix before anything else.
