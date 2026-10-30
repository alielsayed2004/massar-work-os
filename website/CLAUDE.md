# Massar website — build SOP for Claude Code

> **Scope:** this site lives in `website/` inside the massar-work-os repo. Work only inside `website/`. Never touch the Work OS app (`src/`, `supabase/`, root config). Run all commands from `website/`.

You are building the public website for **Massar**, an integrated creative + business partner for ambitious startups and SMEs (Egypt first, then GCC). The site is a **portfolio that proves Massar solves problems**. Case studies are the product.

Read this whole file before writing code. Then read, in order:
1. `reference/mockups/home-desktop.png`, `home-mobile.png`, `case-desktop.png`, `case-mobile.png` — the approved look.
2. `reference/mockups/home.html` and `case.html` — the same mockups as HTML (exact copy, spacing, colors). Treat them as the visual spec, not as code to paste.
3. `reference/mockups/direction.png` and `motion-seo.png` — art direction, motion, 3D, SEO/GEO rules.
4. `reference/Massar_Brand_Guidelines_2026.pdf` — the brand book. It wins any conflict.

---

## 0. Non-negotiables

- **English only.** `lang="en"`, LTR. No Arabic UI.
- **Background is white (#FFFFFF).** Sections alternate White / Ink / Green. Never two dark sections in a row. Bone (#F1ECE2) only as an image frame/fill.
- **Brand colors only** (tokens below). No new tints. Clay is emphasis only: link underline, one number, one rule per view.
- **Fonts:** Switzer for everything. Cormorant Garamond only for the tagline "One partner. One path." Never use Cairo or system display fonts.
- **Logo is locked.** Use the PNGs in `public/brand/` (replace with SVG masters when Ali provides them). Never recolor, stretch, rotate or rebuild it. Min lockup width 120px.
- **Real photography only.** No AI-generated or stock imagery. Until photos exist, use labeled placeholder blocks (`REAL PHOTO · S01`). Shot codes S01–S12 come from Massar's shot library.
- **No invented facts.** Every client name, number, quote and result stays as a visible `[placeholder]` until Ali supplies it. Never make up metrics or testimonials.
- **One CTA:** "Start a project" → `/start`. In the nav and at the end of every page.
- **Voice:** lead with the point, active voice, short sentences, name outcomes. Avoid: 360°, disruptive, full-service, best-in-class, viral, creative solutions, innovative.

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Astro 5** (static output) | Ships HTML by default → best SEO/GEO and Core Web Vitals |
| Styling | Plain CSS with custom properties (`src/styles/tokens.css`, `global.css`), scoped component styles | Small, exact control; no utility-class soup |
| Content | Astro **content collections** (MDX) for `work`, `problems`, `notes` | Case studies are data with a fixed schema |
| 3D | **three.js** in one lazy island (`HeroMonogram`) | Only one 3D moment on the site |
| Motion | CSS + `IntersectionObserver`; Astro View Transitions | No heavy animation libraries needed |
| Forms | `/start` posts to a serverless endpoint or Formspree (ask Ali) | |
| Hosting | **Vercel** (static) | |
| Package manager | pnpm | |

Do not add React/Vue unless an island truly needs it.

## 2. Design tokens — `src/styles/tokens.css`

```css
:root{
  --green:#0D3B34; --bone:#F1ECE2; --ink:#101815; --clay:#B85333; --stone:#9A9791; --white:#FFFFFF;
  --font-sans:"Switzer", system-ui, sans-serif;
  --font-serif:"Cormorant Garamond", Georgia, serif;   /* tagline only */
  /* type: clamp(mobile, fluid, desktop) */
  --t-display:clamp(48px, 6.4vw, 92px);   /* 600, line-height 1.02, tracking -0.03em */
  --t-h2:clamp(34px, 3.9vw, 56px);        /* 600, 1.1, -0.02em */
  --t-h3:clamp(24px, 2.1vw, 30px);        /* 600, 1.25 */
  --t-body:18px;  --t-body-sm:16px;       /* 400, 1.7 */
  --t-label:13px;                          /* 600, caps, tracking 0.22em */
  --t-stat:clamp(64px, 6.7vw, 96px);       /* 900, -0.04em */
  /* space (8 scale) */
  --s-1:8px; --s-2:16px; --s-3:24px; --s-4:40px; --s-5:64px; --s-6:104px; --s-7:140px;
  --gutter:24px; --margin:clamp(20px, 5.5vw, 80px); --max:1440px;
  --rule:1px solid currentColor;
  --ease:cubic-bezier(.2,.7,.2,1);
}
```
Contrast pairs that pass WCAG AA for body text: Ink/White, Green/White, Ink/Bone, Green/Bone. Stone on Ink only for labels ≥13px caps. Clay on white only at ≥24px or as a rule.

Grid: desktop ≥1200 → 12 cols, gutter 24, margin 80, max 1440. Tablet 768–1199 → 8 cols, gutter 20, margin 40. Mobile <768 → 4 cols, gutter 16, margin 20. Section padding: 140px desktop / 96px mobile.

Fonts: Switzer woff2 files are in `public/fonts/` (300–900). Self-host with `font-display: swap` and preload 400 + 600. Cormorant Garamond 500 italic: self-host via `@fontsource/cormorant-garamond`. Confirm Switzer license (Fontshare / Indian Type Foundry Free Font License) before launch.

## 3. Information architecture

```
/                      Home
/work                  All case studies + filter (Branding, Campaigns, Outdoor, Growth)
/work/[slug]           Case study
/problems/[slug]       Problem landing pages (SEO/GEO): one buyer problem → solved-by cases
/process               How we work (Diagnose · Direct · Build · Prove · Next step)
/about                 Company, team (portraits Ink mono), values
/notes/[slug]          Field notes (short real-world posts)
/start                 4-step brief form
/404, /privacy
```
Nav: Work · Problems we solve · Process · FAQ (anchor on home) · [Start a project].
Mobile nav: hamburger → full-screen Ink overlay, links at --t-h2.

## 4. Page specs

### Home (`reference/mockups/home.html`)
Order and background:
1. **Header** (white, 1px Ink bottom rule). Wordmark left, nav right.
2. **Hero** (white). Label `CREATIVE + BUSINESS PARTNER · CAIRO`; H1 "Too many moving parts? / One clear direction." (second line Green); subline; two buttons; right column = `HeroMonogram` on a Bone panel.
3. **Trusted by** strip (client names/logos, Stone, between two rules).
4. **Featured case** (Ink): title, large image, three columns THE PROBLEM / WHAT WE DID / THE RESULT (result as --t-stat).
5. **Problems we solve** (white): 4 cards, quote-style headline in the buyer's words, one line answer, "See the case" link → `/problems/[slug]`.
6. **Case studies** (Green): filter chips + 2-col grid of `CaseCard` (image, tags, "[Client]: [problem]", "Result: …"), "All case studies" button.
7. **Process** (white): 5 steps, step 05 number in Clay.
8. **What we do + FAQ** (Ink): 4 services list; FAQ accordion (`<details>`), first item open.
9. **CTA** (Green): "Bring us the problem. / We'll bring one direction." + tagline (Cormorant) + white button.
10. **Footer** (Ink).

### Case study (`reference/mockups/case.html`) — `/work/[slug]`
1. Header (Ink variant). 2. Hero (Ink): breadcrumb label, H1 = outcome sentence, meta row (Client · Sector · Services · Timeline), hero image overlapping into the white section below.
3. **"The case in 20 seconds"** — Problem / Solution / Result. Required on every case (GEO).
4. The challenge (text) + The approach (4 numbered steps: Diagnose, Direct, Build, Prove).
5. The work (Green): image grid + optional muted video loop, captions under images.
6. The results: up to 3 stats with "metric · period · source"; client quote with Clay left rule.
7. Next case (Ink) + Start a project.

### Problems `/problems/[slug]`
H1 = the problem in the buyer's words. Answer-first paragraph (2–3 sentences). "How we solve it" (3 steps). Related cases (CaseCard). FAQ (3 Q&As, FAQPage schema). CTA.

### Start `/start`
4 steps: 1) What's the problem? (choose from the 4 problems or "Other") 2) Business (name, sector, size) 3) Goal + timeline + budget range 4) Contact. Progress bar fills left→right. Plain HTML form, accessible labels, validation messages, success screen. Ask Ali where submissions go.

## 5. Content model (`src/content.config.ts`)

`work` (MDX):
```ts
{ title: string;            // outcome sentence, used as H1
  client: string; sector: string; services: string[]; year: number; durationWeeks?: number;
  tags: ("Branding"|"Campaigns"|"Outdoor"|"Growth")[];
  problem: string; solution: string;            // one sentence each (TL;DR)
  results: { value: string; metric: string; period?: string; source?: string }[]; // max 3
  quote?: { text: string; name: string; role: string };
  hero: image; heroAlt: string; featured?: boolean; order: number;
  problems: reference("problems")[]; updated: date; }
```
`problems`: `{ title (buyer quote), answer (2–3 sentences), steps: string[3], faqs: {q,a}[], cases: reference("work")[] }`
`notes`: `{ title, date, shot (S01–S12), image, body }`

Seed with **2 placeholder cases and the 4 problems** shown in the mockup, all values in `[brackets]`, and `draft: true` so they never get published by mistake. Ali will replace them.

## 6. Motion spec

| Moment | Spec |
|---|---|
| Page load | Hero H1 lines reveal (opacity 0→1, y 24→0), 80ms stagger, 700ms, `--ease` |
| Scroll reveal | `[data-reveal]` elements: fade + 24px rise, 700ms, once, IntersectionObserver threshold 0.15 |
| Case images | scale 0.92→1 while entering viewport (CSS scroll-driven animation with JS fallback) |
| Stats | count up from 0 over 1.2s when visible; final value is in the HTML for SEO |
| Case card hover | 3D tilt max 4° toward cursor (perspective 1000px) + image scale 1.02; disabled on touch |
| Page transitions | Astro View Transitions: card image morphs into case hero (`transition:name`) |
| Links | Clay underline grows from left, 240ms |
| Never | scroll-jacking, custom cursors, parallax backgrounds, autoplay with sound |

Everything respects `prefers-reduced-motion: reduce` (no transforms, instant states).

## 7. 3D — `HeroMonogram` island

- Build the mesh from the Massar monogram **SVG master** (ask Ali for it; until then, trace from `public/brand/massar_mono_green.png` only as a temporary stand-in and flag it). `SVGLoader` → `ExtrudeGeometry` depth ≈ 6% of width, small bevel.
- Material: matte, Massar Green (#0D3B34), soft key light + ambient; background transparent over a Bone panel.
- Load: split the monogram into its 4 arms; arms start 30% apart and converge to centre in 1.6s (`--ease`). That is the brand idea: many parts → one direction.
- Idle: tilt up to ±8° toward the cursor, spring back to **upright, front-facing** (logo is locked; it must always settle exactly as the 2D mark).
- Performance: `client:visible`, dynamic `import('three')`, DPR capped at 2, pause when off-screen. The **LCP element is a static PNG/AVIF of the monogram** rendered in the same spot; the canvas fades in over it.
- Fallback: static image on mobile <768px, on `prefers-reduced-motion`, and if WebGL is unavailable.
- JS budget for this island: ≤ 160 KB gzipped.

## 8. SEO + GEO checklist

- Static HTML for every route; exactly one `<h1>`; logical `h2/h3`; landmark elements.
- `<title>` ≤ 60 chars, meta description ≤ 155, canonical, Open Graph + Twitter image per page (generate OG images for cases from hero + title).
- JSON-LD:
  - Home: `Organization` + `ProfessionalService` (name "Massar", url, logo, email brand@massar.agency, areaServed Egypt + GCC, sameAs links Ali provides).
  - Case: `Article` (or `CreativeWork`) with `headline`, `datePublished`, `dateModified`, `author` Organization, `about` client, `image`.
  - Problems + home FAQ: `FAQPage`. All pages: `BreadcrumbList`.
- **Answer-first content:** every case and problem page starts with the TL;DR block in plain HTML (no images of text). Numbers include period and source.
- Visible "Last updated" date on cases and problem pages.
- `@astrojs/sitemap`; `robots.txt` that **allows** Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, Google-Extended; `llms.txt` at the root listing the key pages with one-line summaries (optional standard, cheap to add).
- Images: AVIF/WebP via `astro:assets`, explicit width/height, descriptive `alt`, lazy below the fold; hero image `fetchpriority="high"`.
- Core Web Vitals targets (75th percentile): **LCP < 2.5s, INP < 200ms, CLS < 0.1**. Lighthouse ≥ 95 in all four categories on Home and a Case page, mobile profile.
- Entity consistency: same name, one-line description and URLs across the site footer, Google Business Profile, LinkedIn, Behance, Instagram.

## 9. Accessibility

WCAG 2.1 AA. Real `<button>`/`<a>`; visible focus ring (2px Clay outline, 2px offset); skip link; form labels and error text; accordion via `<details>`/`<summary>`; alt text on every image; color never the only signal.

## 10. Build order (commit after each step, keep `pnpm build` green)

1. **Scaffold:** Astro + TS, pnpm, ESLint/Prettier, `tokens.css`, `global.css`, fonts, base layout with header/footer, `robots.txt`, sitemap. Deploy preview to Vercel.
2. **Components:** Button (primary/secondary/link), Label, Rule, Section (white/ink/green variants), Container, CaseCard, StatBlock, ProblemCard, FAQ, ImagePlaceholder (`REAL PHOTO · Sxx`), Nav + mobile menu.
3. **Content collections** + seed placeholders (draft).
4. **Home** to match `home-desktop.png` and `home-mobile.png`.
5. **Case template** to match `case-desktop.png` / `case-mobile.png`; `/work` index with filters.
6. **Problems**, **Process**, **About**, **Notes**, **Start** form, 404, privacy.
7. **Motion** (section 6), then **HeroMonogram** (section 7).
8. **SEO/GEO** (section 8): JSON-LD, OG images, llms.txt, meta.
9. **QA** (section 11), fix, then hand to Ali.

Before each step, state the plan in 3–5 lines. After each step, take screenshots at 1440 and 390 and compare to the reference PNGs; list differences and fix them before moving on.

## 11. Definition of done

- [ ] Visual match to reference mockups at 1440, 1024, 768, 390 (no horizontal scroll at 390).
- [ ] Only brand tokens used (grep for stray hex values).
- [ ] No invented content; all placeholders still in `[brackets]` or replaced by Ali's real data.
- [ ] Lighthouse mobile ≥ 95 ×4 on `/` and one `/work/[slug]`; CWV targets met.
- [ ] JSON-LD validates (Rich Results Test); sitemap + robots + llms.txt reachable.
- [ ] Keyboard-only walkthrough works; reduced-motion respected; 3D falls back cleanly.
- [ ] `/start` form submits and shows success; errors are announced.
- [ ] README updated with how to add a case study.

## 12. Open questions for Ali (ask, don't guess)

1. SVG masters for the logo and monogram.
2. Real case studies: client names (with permission), photos, numbers, quotes.
3. Domain (massar.agency?) and where `/start` submissions should go (email / CRM).
4. Social profile URLs for `sameAs`.
5. Switzer license confirmation.
