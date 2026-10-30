import type { APIRoute } from "astro";
import { getProblems, getWork } from "../lib/content";
import { org } from "../data/site";

/** llms.txt (https://llmstxt.org): key pages with one-line summaries. */
export const GET: APIRoute = async ({ site }) => {
  const url = (p: string) => (site ? new URL(p, site).href : p);
  const work = await getWork();
  const problems = await getProblems();
  const lines = [
    `# ${org.name}`,
    "",
    `> ${org.description}`,
    "",
    `Contact: ${org.email}. Based in Cairo; works in Egypt and the GCC.`,
    "",
    "## Pages",
    `- [Home](${url("/")}): what Massar does, featured case, problems we solve, process, FAQ.`,
    `- [Case studies](${url("/work")}): every case, each with problem, solution and measured result.`,
    `- [Problems we solve](${url("/problems")}): the four problems clients bring, what causes them and the cases that fixed them.`,
    `- [Services](${url("/services")}): digital and outdoor marketing, business development, brand, consulting.`,
    `- [Process](${url("/process")}): Diagnose, Direct, Build, Prove, Next step.`,
    `- [About](${url("/about")}): the company, services and team.`,
    `- [Start a project](${url("/start")}): four-step project brief.`,
    "",
    "## Case studies",
    ...work.map(
      (w) => `- [${w.data.title}](${url(`/work/${w.id}`)}): ${w.data.problem} ${w.data.solution}`,
    ),
    "",
    "## Problems we solve",
    ...problems.map((p) => `- ["${p.data.title}"](${url(`/problems/${p.id}`)}): ${p.data.short}`),
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
