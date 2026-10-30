# Massar website — design system

One frame, a fixed type scale, two weights. Direction: bold agency (full-screen media, huge type, motion with a purpose). Every value lives in `src/styles/tokens.css`;
component styles use the tokens, never raw sizes.

## Frame

- 12 columns, 24px gutter (16px on mobile), **1040px of content**, side margin `max(20px, 5vw)`.
- Splits use column spans only: 5/7, 6/6, 4/4/4, 3/3/3/3. No `1.2fr`-style ratios.
- Titles max ~8 columns, paragraphs max ~6 columns (about 65 characters).
- Content is anchored to the top of its section; spare space goes to the bottom.
- Full-bleed is reserved for photographs: the case stack.

## Type (Switzer)

| Token            | Size    | Use                                |
| ---------------- | ------- | ---------------------------------- |
| `--fs-xs`        | 13px    | meta, tags, captions, small labels |
| `--fs-body`      | 16px    | body, buttons, nav                 |
| `--fs-lead`      | 18px    | lead paragraphs, emphasised lines  |
| `--fs-h3`        | 22px    | card titles, small headings        |
| `--fs-title`     | 28–40px | section titles, numbers            |
| `--fs-statement` | 36–64px | page H1, home hero, CTA            |

Weights: **400** to read, **500** for titles and controls. Nothing heavier.
Cormorant Garamond italic is used only for the tagline "One partner. One path."

## Colour

Brand colours only, no tints. Sections alternate White / Ink / Green, never two dark in a row.
Bone is the one panel fill. Clay is emphasis only: link underline, the last path station, one bar.

## Space

8px scale: 8 · 16 · 24 · 40 · 64 · 104. Section padding 104px (72px on mobile).

## Home signature moves

- Hero: the marketing pieces a business juggles (billboard, social post, logo_v7_FINAL, paused ad set, unsigned brief, fifth supplier's invoice) scattered on Ink; on scroll they fold onto one Green line under "One clear direction." Phones fold them into two columns. Reduced motion shows the finished state.
- Statement: "Most marketing problems aren't marketing problems. They're direction problems." turns Green word by word.
- "Sound familiar?": the four buyer problems as giant rows that open to cause, fix and proof.
- Case stack: full-screen sticky panels that slide over each other.
- Service index: giant rows, picture follows the cursor.

## Page layout
Every page uses the same three moves, so the site reads as one piece:
- **PageHero:** full-bleed cinematic picture, title bottom-left over an Ink gradient, header overlaid (Services, Problems, Process, About, Work, each problem page).
- **SplitRow:** editorial row, picture 7 columns and text 5, alternating sides (services, problems, the About story).
- **Picture bands and stacks:** the case stack on Home; full-bleed case heroes.
Picture per page: Services (campaign review), Problems (hoardings), Process (one road through Cairo), About (downtown studio), Work (desert billboard), Start (brief notebook).

## Components

- **Buttons:** square, 48px+ tall, primary (filled) / secondary (outlined) / link (Clay underline).
- **Panels:** Bone fill, no border, no radius, no shadow.
- **Path:** one thick Green line with round stations; the brand idea (Massar = path).
- No eyebrow labels above headings, no 01/02 section numbers, no tracked caps, no pills.

## Art direction (imagery)

One shoot, one look: **cinematic Cairo**. Every picture follows this recipe until real photography replaces it.

- **Where:** Cairo and its new cities: streets, shops, studios, offices, roads.
- **Camera:** film-still feel, 35mm, anamorphic widescreen (16:9). Angles with attitude: road-level low angles, rooftop high angles, Dutch tilts, over-the-shoulder, straight top-down, shooting through shop glass.
- **Motion:** slow shutter. Motorbikes, cars, passers-by and hands carry motion blur; the subject stays sharp.
- **Light:** golden hour or blue hour, hard window light and long shadows, warm haze, soft halation.
- **Colour:** dramatic contrast; Massar Green, Bone and near-black dominate, with one small Clay accent per frame (a clay pot, a cup, a saucer).
- **Never:** text, letters, logos, readable signage, watermarks.

Current demo images are generated with Freepik (Nano Banana 2.1), all with the café-corner shot as the style reference, and are tagged "Generated image · demo" on the page. The brand book asks for real photography at launch: reshoot the same list with this recipe.

Prompt used for every image (subject first, then):

> Cinematic film still … Shot on 35mm film with a slow shutter, anamorphic widescreen feel, dramatic contrast with deep shadows, warm haze and soft halation, rich grade of deep forest green (#0D3B34), warm bone cream (#F1ECE2) and near-black, one small terracotta clay (#B85333) accent, visible film grain. No text, no letters, no logos, no readable signage, no watermark.

## Opening logo motion

On the first page of a visit the monogram's four arms (the real artwork, each clipped to its quarter) travel in from the edges and lock into the mark, the wordmark rises, a Clay line runs along the bottom and the Ink curtain lifts (about 2.4s). Once per session, skipped by click or key, never under reduced motion, and the hero headline waits for it.
