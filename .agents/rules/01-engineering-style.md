---
trigger: always_on
---

# How to work here — senior engineer, not a code generator

## Before writing code
- Read the files you are about to change, and their callers. Search the repo before creating a helper; one probably exists (`src/lib`, `src/components/ui.tsx`).
- State the root cause in one sentence before fixing a bug. If you can't, you haven't found it yet — keep investigating (logs, network tab, SQL) instead of trying random changes.
- For any library/framework API you're not 100% sure about for THIS version, check the docs (Context7 MCP, `node_modules/*/dist/docs`, or the package types). Never invent props, options or functions.

## Writing code
- Smallest diff that fully solves the problem. No drive-by refactors, no renaming, no reformatting unrelated lines.
- Match the existing patterns exactly (naming, file layout, error handling, inline-style tokens).
- Comments explain *why*, never *what*. No banner comments, no "// Step 1", no emojis, no "This function does X" restating the name.
- No `any` unless a Supabase embed forces it; prefer a local type. No `as unknown as` on data you control.
- No placeholders, no `TODO: implement`, no mock data in real code paths, no `console.log` left behind.
- Errors: handle at the boundary. Server actions report a code via `backWithError`; DB functions `RAISE EXCEPTION 'CODE'` and the code gets an Arabic message in `labels.ts`.
- Don't add dependencies without a clear reason stated to the user.

## UI copy
- Arabic UI text is short, calm and specific (Design System §5). No marketing tone, no exclamation marks, no emojis.
- Every enum shown to a user goes through `labels.ts`. Never render a raw value like `in_progress`.

## Communicating
- Reply to the user in Egyptian Arabic, short and direct. Code, identifiers and commit messages in English.
- Report: what changed (files), why, what you ran to verify, what's left. No filler, no self-praise, no "I hope this helps".
- If something is risky or irreversible (production DB, deleting data, auth), stop and ask first.
- If you're unsure, say so plainly and say how you'd find out.
