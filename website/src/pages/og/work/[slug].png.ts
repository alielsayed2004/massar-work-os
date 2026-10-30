import type { APIRoute, GetStaticPaths } from "astro";
import { getWork, type Work } from "../../../lib/content";
import { ogImage } from "../../../lib/og";

export const getStaticPaths: GetStaticPaths = async () =>
  (await getWork()).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));

export const GET: APIRoute = ({ props }) => {
  const { data } = (props as { entry: Work }).entry;
  return ogImage({
    label: ["Case study", ...data.tags].join(" · "),
    title: data.title,
    tone: data.heroTone,
    shot: data.heroShot,
  });
};
