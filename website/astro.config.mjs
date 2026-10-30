// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// The production domain is still an open question for Ali.
// Set SITE_URL (e.g. in Vercel env) once it is confirmed; until then no
// sitemap is emitted and robots.txt omits the Sitemap line.
const site = process.env.SITE_URL || undefined;

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: site ? [sitemap()] : [],
});
