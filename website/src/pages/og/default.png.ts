import type { APIRoute } from "astro";
import { ogImage } from "../../lib/og";

export const GET: APIRoute = () =>
  ogImage({
    label: "Creative + business partner · Cairo",
    title: "Too many moving parts? One clear direction.",
  });
