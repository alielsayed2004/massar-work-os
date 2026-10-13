---
trigger: always_on
---

# Massar Work OS — project context

Internal operations system + client portal for Massar. One Next.js monolith on Supabase.

## Stack (exact versions matter)
- Next.js **16.4** App Router, React 19.3, TypeScript strict. `cacheComponents` is ON.
  This is NOT the Next.js in your training data: read `node_modules/next/dist/docs/` before touching routing, caching, `proxy.ts`, or route config. Never guess an API.
- Every page/layout that reads cookies, auth or `searchParams` needs `export const instant = false;`.
- Supabase: Postgres + Auth + Storage (private bucket `massar_files`). Clients: `src/lib/supabase/{server,client,admin}.ts`.
- Styling: plain inline styles + CSS variables from `src/app/globals.css` (tokens). No Tailwind, no UI kit.
- Dates: `date-fns-tz`. Store UTC, input and display `Africa/Cairo` via `src/lib/labels.ts` (`cairoInputToUtcIso`, `formatCairo`).

## Source of truth (read before product decisions)
1. `ملحق القرارات والإضافات المعتمدة — Massar Work OS.md` — highest authority, §5 acceptance criteria are non-negotiable.
2. `MASSAR WORK OS — Product & Architecture Brief.md`
3. `Massar Work OS — Design System v1.md` + `massar-design-tokens.css`
If code and these docs disagree, the docs win. If the docs are ambiguous, ask — don't invent product rules.

## Map
- `src/app/(dashboard)/*/page.tsx` — role pages: my-work (member), my-team (manager), deliverables, projects, admin, client-portal.
- `src/app/actions/*.ts` — server actions. They call DB RPCs and report via `backWithError/backWithOk` (`src/lib/flash.ts`).
- `src/components/ui.tsx` — `s` styles, `StatusBadge`, `Flash`, `Empty`. Reuse them; don't restyle per page.
- `src/lib/labels.ts` — Arabic labels for every enum + error-code → message map.
- `supabase/migrations/` — 001…008 applied in production. `init.sql` = all of them for a fresh DB only.

## Security model (the part that must never regress)
- Roles: admin, manager (team lead), member, client. Scope = role + team/client.
- **Every status or ownership change is a `SECURITY DEFINER` Postgres function** that checks `auth.uid()`:
  `update_task_status`, `request_handover`, `process_handover_decision`, `create_deliverable_version`,
  `submit_version_for_review`, `process_review_decision`, `share_version_with_client`.
  RLS blocks direct UPDATE of those columns. Never "fix" a failing action by loosening RLS or using the service key.
- Service-role client (`createAdminClient`) only after an explicit permission check, only server-side, only for invites and signed download URLs.
- Clients see only versions explicitly shared with their company. Internal notes, activity, tasks: never.
- Hiding a button is not security. If the UI hides it, the DB must also refuse it.

## Definition of done
A change is done only when `npm run check` passes (typecheck + lint) and, for anything touching routing/config, `npm run build` passes. Say exactly what you ran and what it printed. Never write "✅ tested" for something you didn't run.
