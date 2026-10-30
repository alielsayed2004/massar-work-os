# Massar — website

Portfolio site for Massar: an integrated creative + business partner. English, white background, case-study first.

**Status:** build steps 1–8 done; waiting on real content and the open questions in `CLAUDE.md` §12. The build instructions for Claude Code are in [`CLAUDE.md`](CLAUDE.md).

## What's here

```
CLAUDE.md                      Build SOP: stack, tokens, pages, motion, 3D, SEO/GEO, QA
reference/
  Massar_Brand_Guidelines_2026.pdf
  mockups/home.html, case.html  Approved mockups (open in a browser)
  mockups/*.png                 Same mockups as screenshots (desktop 1440 + mobile 390)
  mockups/direction.*           Art direction board
  mockups/motion-seo.*          Motion, 3D, SEO and GEO board
  brand/                        Logo PNGs (temporary until SVG masters are added)
  fonts/                        Switzer woff2
public/brand, public/fonts      Same assets, ready for the site
```

## Start building (Claude Code)

This site lives in the `website/` folder of the massar-work-os repo, on the `website` branch. Open the repo in Claude Code, check out the `website` branch, and say:

> Work only inside website/. Read website/CLAUDE.md and the reference mockups, then do step 1 of the build order.

Then continue step by step. Real client names, numbers and photos come from Ali; until then everything stays as `[placeholder]`.

## Develop

```bash
pnpm install
pnpm dev                              # http://localhost:4321 — drafts visible
pnpm build                            # astro check + static build to dist/
PUBLIC_SHOW_DRAFTS=true pnpm build    # preview build that includes draft content
pnpm lint && pnpm format:check
```

### Environment variables

| Variable               | What it does                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`             | Production domain (e.g. `https://massar.agency`, once confirmed). Turns on canonical URLs, absolute OG/JSON-LD URLs, the sitemap and the `Sitemap:` line in `robots.txt`. |
| `PUBLIC_SHOW_DRAFTS`   | `true` on preview deploys to show `draft: true` content. Leave unset in production.                                                                                       |
| `PUBLIC_FORM_ENDPOINT` | Where `/start` POSTs the brief as JSON (e.g. a Formspree URL). Unset = the brief opens as an email to brand@massar.agency.                                                |

## Add a case study

1. Create `src/content/work/<slug>.mdx`. Copy an existing case as the template; the schema is in `src/content.config.ts` and the build fails if a field is missing or wrong.
2. Fill the frontmatter:
   - `title` — the outcome sentence (the H1). `summary` — the problem in one line, shown on cards as "Client: summary".
   - `problem` / `solution` — one sentence each; they become "The case in 20 seconds".
   - `results` — up to 3, each with `value`, `metric`, `period`, `source`. Only real, approved numbers.
   - `tags` — any of Branding, Campaigns, Outdoor, Growth. `problems` — ids from `src/content/problems/`.
   - `heroShot` / `gallery[].shot` — shot codes S01–S12. When the real photo exists, put it in `src/assets/work/` and set `hero: ../../assets/work/<file>.jpg` plus `heroAlt`.
   - `updated` — today's date; it is shown as "Last updated".
3. Write the challenge (two short paragraphs) as the MDX body.
4. Set `draft: false` only when the client has approved the names, numbers and quote.
5. `pnpm build`, check `/work/<slug>`, commit.

Problems (`src/content/problems/`) and field notes (`src/content/notes/`) work the same way.

## Add a portfolio piece

Edit `src/data/portfolio.ts`: import the picture from `src/assets/…`, then add an entry with `title`, `client`, `discipline` (Branding, Campaigns, Outdoor, Social, Packaging, Spaces, Digital), `year`, `alt`, `size` (`wide`, `tall` or `square`, which sets its tile in the grid) and, if it has one, the `caseId` of its case study. Set `draft: false` once the client has approved it.

## Add a client

Edit `src/data/clients.ts`: `name`, `sector`, optionally `logo` (an imported image) and `caseId`. Only list clients who have agreed to be named. Testimonials live in the same file and must be real, approved quotes.
