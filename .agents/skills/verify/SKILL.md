---
name: verify
description: Run the project's quality gate (typecheck, lint, production build) and report exact results. Use before saying any change is done, after editing TS/TSX/config, or when the user types /verify.
---

# Verify

Run, in order, from the repo root. Stop at the first failure, fix it, then rerun from the top.

1. `npm run typecheck` — must print nothing and exit 0.
2. `npm run lint` — 0 errors. Warnings in files you touched must be fixed; pre-existing warnings elsewhere can stay.
3. `npm run build` — required if you touched routing, `proxy.ts`, `next.config.ts`, layouts, route config (`instant`), env usage, or added a page. Must end with the route table.

If the dev server is running, also open the affected page(s) in the browser and check the console for errors (ignore `bis_skin_checked` hydration noise — that's a browser extension).

## Report format (to the user, Egyptian Arabic)
- Ran: the exact commands.
- Result: pass/fail per command, with the first error verbatim if any.
- Not covered: anything you could not verify (e.g. needs real Supabase data, email, storage upload).

Never claim a check passed that you did not run in this session.
