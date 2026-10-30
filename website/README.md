# Massar — website

Portfolio site for Massar: an integrated creative + business partner. English, white background, case-study first.

**Status:** design approved, build not started. The build instructions for Claude Code are in [`CLAUDE.md`](CLAUDE.md).

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
pnpm dev          # http://localhost:4321
pnpm build        # astro check + static build to dist/
pnpm lint && pnpm format:check
```

Set `SITE_URL` (e.g. `https://massar.agency`, once confirmed) to emit canonical URLs, the sitemap and the `Sitemap:` line in `robots.txt`.
