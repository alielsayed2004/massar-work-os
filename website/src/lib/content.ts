import { getCollection, type CollectionEntry } from "astro:content";

/**
 * Seed content is marked `draft: true` so it is never published by mistake.
 * Drafts show in `pnpm dev`, and in builds with PUBLIC_SHOW_DRAFTS=true
 * (preview deploys). Production builds leave them out.
 */
export const showDrafts = import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === "true";
const visible = ({ data }: { data: { draft: boolean } }) => showDrafts || !data.draft;

export type Work = CollectionEntry<"work">;
export type Problem = CollectionEntry<"problems">;
export type Note = CollectionEntry<"notes">;

export async function getWork(): Promise<Work[]> {
  return (await getCollection("work", visible)).sort((a, b) => a.data.order - b.data.order);
}

export async function getProblems(): Promise<Problem[]> {
  return (await getCollection("problems", visible)).sort((a, b) => a.data.order - b.data.order);
}

export async function getNotes(): Promise<Note[]> {
  return (await getCollection("notes", visible)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
}

/** Cases that solved a given problem. */
export function casesFor(problemId: string, work: Work[]): Work[] {
  return work.filter((w) => w.data.problems.some((p) => p.id === problemId));
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const resultCaption = (r: { metric: string; period?: string; source?: string }) =>
  [r.metric, r.period, r.source].filter(Boolean).join(" · ");
