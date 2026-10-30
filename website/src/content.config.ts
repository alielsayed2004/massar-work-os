import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

const tone = z.enum(["stone", "ink", "bone", "white"]);
const shot = z.string().regex(/^S(0[1-9]|1[0-2])$/, "Shot codes run S01–S12");

const work = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/work" }),
  schema: ({ image }) =>
    z.object({
      /** Outcome sentence, used as the H1. */
      title: z.string(),
      client: z.string(),
      /** The problem in one line, for cards: "[Client]: <summary>". */
      summary: z.string(),
      sector: z.string(),
      services: z.array(z.string()),
      year: z.number(),
      durationWeeks: z.union([z.number(), z.string()]).optional(),
      tags: z.array(z.enum(["Branding", "Campaigns", "Outdoor", "Growth"])).min(1),
      /** TL;DR, one sentence each. */
      problem: z.string(),
      solution: z.string(),
      results: z
        .array(
          z.object({
            value: z.string(),
            metric: z.string(),
            period: z.string().optional(),
            source: z.string().optional(),
          }),
        )
        .max(3),
      quote: z.object({ text: z.string(), name: z.string(), role: z.string() }).optional(),
      challengeTitle: z.string(),
      approach: z.object({
        diagnose: z.string(),
        direct: z.string(),
        build: z.string(),
        prove: z.string(),
      }),
      gallery: z
        .array(
          z.object({
            kind: z.enum(["photo", "video", "identity"]),
            shot: shot.optional(),
            label: z.string().optional(),
            tone: tone.optional(),
            src: image().optional(),
            alt: z.string().optional(),
            wide: z.boolean().default(false),
          }),
        )
        .default([]),
      galleryCaption: z.string().optional(),
      /** Real hero photo. Until it exists, heroShot renders a placeholder. */
      hero: image().optional(),
      heroShot: shot,
      /** True while images are stock stand-ins (shown with a STOCK · DEMO tag). */
      demoImages: z.boolean().default(false),
      heroTone: tone.default("stone"),
      heroAlt: z.string(),
      featured: z.boolean().default(false),
      order: z.number(),
      problems: z.array(reference("problems")).default([]),
      updated: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
});

const problems = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/problems" }),
  schema: z.object({
    /** The problem in the buyer's words (no quote marks). */
    title: z.string(),
    /** One-line answer for the home card. */
    short: z.string(),
    /** Answer-first paragraph, 2–3 sentences. */
    answer: z.string(),
    steps: z.array(z.string()).length(3),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).max(3),
    order: z.number(),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/notes" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      shot,
      image: image().optional(),
      imageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { work, problems, notes };
