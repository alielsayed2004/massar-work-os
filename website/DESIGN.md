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

## Components

- **Buttons:** square, 48px+ tall, primary (filled) / secondary (outlined) / link (Clay underline).
- **Panels:** Bone fill, no border, no radius, no shadow.
- **Path:** one thick Green line with round stations; the brand idea (Massar = path).
- No eyebrow labels above headings, no 01/02 section numbers, no tracked caps, no pills.
