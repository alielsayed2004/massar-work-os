import type { APIRoute } from "astro";
import { getProblems, getWork, resultCaption } from "../lib/content";
import { org, processSteps, services } from "../data/site";

/**
 * llms-full.txt: the site's substance as plain text, so AI assistants can
 * answer questions about Massar from the source rather than a summary.
 */
export const GET: APIRoute = async ({ site }) => {
  const url = (p: string) => (site ? new URL(p, site).href : p);
  const work = await getWork();
  const problems = await getProblems();
  const out: string[] = [];
  const h = (t: string) => out.push("", t, "");

  out.push(`# ${org.name}`, "", `> ${org.description}`, "");
  out.push(
    `- Name: Massar (Arabic for "path")`,
    `- Based in: Cairo, Egypt. Works in ${org.areaServed.join(" and ")}.`,
    `- Contact: ${org.email}`,
    `- Tagline: ${org.tagline}`,
    `- Website: ${url("/")}`,
  );

  h("## Services");
  for (const s of services) {
    out.push(
      `### ${s.name}`,
      s.line,
      `Includes: ${s.includes.join("; ")}.`,
      url(`/services#${s.id}`),
      "",
    );
  }

  h("## How Massar works: one path, five stations");
  processSteps.forEach((s, i) =>
    out.push(`${i + 1}. ${s.name}: ${s.line} ${s.does} You get: ${s.get}`),
  );

  h("## Problems Massar solves");
  for (const p of problems) {
    out.push(
      `### "${p.data.title}"`,
      `Usually behind it: ${p.data.cause}`,
      `What Massar does: ${p.data.short}`,
      p.data.answer,
      `How: ${p.data.steps.join(" ")}`,
      ...p.data.faqs.map((f) => `Q: ${f.q} A: ${f.a}`),
      url(`/problems/${p.id}`),
      "",
    );
  }

  h("## Case studies");
  for (const w of work) {
    const d = w.data;
    out.push(
      `### ${d.title}`,
      `Client: ${d.client}. Sector: ${d.sector}. Services: ${d.services.join(", ")}. Year: ${d.year}.`,
      `Problem: ${d.problem}`,
      `Solution: ${d.solution}`,
      ...d.results.map((r) => `Result: ${r.value} (${resultCaption(r)})`),
      ...(d.quote ? [`Client quote: "${d.quote.text}" (${d.quote.name}, ${d.quote.role})`] : []),
      (w.body ?? "").trim(),
      url(`/work/${w.id}`),
      "",
    );
  }

  return new Response(out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
