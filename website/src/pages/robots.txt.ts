import type { APIRoute } from "astro";

// Search and AI crawlers are explicitly allowed (SEO + GEO).
const agents = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "*",
];

export const GET: APIRoute = ({ site }) => {
  const lines = agents.flatMap((a) => [`User-agent: ${a}`, "Allow: /", ""]);
  if (site) lines.push(`Sitemap: ${new URL("sitemap-index.xml", site).href}`);
  return new Response(lines.join("\n").trimEnd() + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
