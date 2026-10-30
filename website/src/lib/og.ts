import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const root = process.cwd();
const font = (w: number) => fs.readFileSync(path.join(root, `src/assets/og/switzer-${w}.ttf`));
const dataUri = (p: string) =>
  `data:image/png;base64,${fs.readFileSync(path.join(root, "public", p)).toString("base64")}`;

const COLORS = { stone: "#9A9791", ink: "#101815", bone: "#F1ECE2", white: "#FFFFFF" } as const;

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

/** 1200×630 Open Graph card: Ink panel, label, title, wordmark, image block on the right. */
export async function ogImage(opts: {
  label: string;
  title: string;
  tone?: keyof typeof COLORS;
  shot?: string;
}): Promise<Response> {
  const tree = h(
    "div",
    {
      width: 1200,
      height: 630,
      display: "flex",
      background: "#101815",
      color: "#FFFFFF",
      fontFamily: "Switzer",
    },
    [
      h(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          width: opts.tone ? 760 : 1200,
        },
        [
          h("div", { display: "flex", flexDirection: "column", gap: 28 }, [
            h(
              "div",
              { fontSize: 20, fontWeight: 600, letterSpacing: 4.4, color: "#9A9791" },
              opts.label.toUpperCase(),
            ),
            h(
              "div",
              {
                fontSize: opts.title.length > 60 ? 50 : 62,
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: -1.5,
              },
              opts.title,
            ),
          ]),
          h("div", { display: "flex", alignItems: "center", gap: 24 }, [
            h("img", { height: 40, width: 247 }, undefined, {
              src: dataUri("brand/massar_wordmark_white.png"),
            }),
            h("div", { width: 64, height: 4, background: "#B85333" }),
          ]),
        ],
      ),
      ...(opts.tone
        ? [
            h(
              "div",
              {
                display: "flex",
                alignItems: "flex-end",
                flex: 1,
                background: COLORS[opts.tone],
                padding: 24,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 3,
                color: opts.tone === "ink" ? "#FFFFFF" : "#101815",
              },
              opts.shot ? `REAL PHOTO · ${opts.shot}` : "",
            ),
          ]
        : []),
    ],
  );

  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Switzer", data: font(500), weight: 500, style: "normal" },
      { name: "Switzer", data: font(600), weight: 600, style: "normal" },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
