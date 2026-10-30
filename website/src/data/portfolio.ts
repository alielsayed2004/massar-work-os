/**
 * Portfolio: single pieces of work, shown as a visual index. Distinct from
 * case studies (the full problem → result story). Every client and year is
 * a placeholder; all pictures are generated demo images until real work
 * photography replaces them. `draft` keeps them out of production builds.
 */
import type { ImageMetadata } from "astro";
import social from "../assets/demo/pf-social.jpg";
import packaging from "../assets/demo/pf-packaging.jpg";
import posters from "../assets/demo/pf-posters.jpg";
import signage from "../assets/demo/pf-signage-night.jpg";
import tote from "../assets/demo/pf-tote.jpg";
import activation from "../assets/demo/pf-activation.jpg";
import website from "../assets/demo/pf-website.jpg";
import delivery from "../assets/demo/pf-delivery.jpg";
import identity from "../assets/demo/identity-flatlay.jpg";
import billboard from "../assets/demo/billboard-desert.jpg";
import hoarding from "../assets/demo/hoarding.jpg";
import billboardDusk from "../assets/demo/billboard-dusk.jpg";
import cafeCounter from "../assets/demo/cafe-counter.jpg";
import retail from "../assets/demo/retail.jpg";

export const disciplines = [
  "Branding",
  "Campaigns",
  "Outdoor",
  "Social",
  "Packaging",
  "Spaces",
  "Digital",
] as const;
export type Discipline = (typeof disciplines)[number];

export type Piece = {
  id: string;
  title: string;
  client: string;
  discipline: Discipline;
  year: string;
  image: ImageMetadata;
  alt: string;
  /** Tile shape in the grid. */
  size: "wide" | "tall" | "square";
  caseId?: string;
  draft: boolean;
};

export const portfolio: Piece[] = [
  {
    id: "cafe-identity",
    title: "Café identity system",
    client: "[Client]",
    discipline: "Branding",
    year: "[2026]",
    image: identity,
    alt: "Identity flat lay: cards, bag, cup and stamp in green and bone",
    size: "wide",
    caseId: "three-branches-one-brand",
    draft: true,
  },
  {
    id: "social-grid",
    title: "Launch month on social",
    client: "[Client]",
    discipline: "Social",
    year: "[2026]",
    image: social,
    alt: "A phone showing a grid of green and bone posts on a Cairo street",
    size: "tall",
    draft: true,
  },
  {
    id: "coffee-packaging",
    title: "Coffee packaging",
    client: "[Client]",
    discipline: "Packaging",
    year: "[2026]",
    image: packaging,
    alt: "Coffee bags with green labels and cups on a café counter",
    size: "square",
    caseId: "three-branches-one-brand",
    draft: true,
  },
  {
    id: "desert-billboard",
    title: "Highway billboard",
    client: "[Client]",
    discipline: "Outdoor",
    year: "[2026]",
    image: billboard,
    alt: "A green billboard on a desert highway, a car speeding past",
    size: "wide",
    caseId: "outdoor-real-estate",
    draft: true,
  },
  {
    id: "street-posters",
    title: "Street poster campaign",
    client: "[Client]",
    discipline: "Campaigns",
    year: "[2026]",
    image: posters,
    alt: "A wall of green and bone posters, a man walking past",
    size: "wide",
    draft: true,
  },
  {
    id: "night-signage",
    title: "Shop signage",
    client: "[Client]",
    discipline: "Spaces",
    year: "[2026]",
    image: signage,
    alt: "A green shop sign glowing at night, car light trails in front",
    size: "tall",
    draft: true,
  },
  {
    id: "tote",
    title: "Merchandise",
    client: "[Client]",
    discipline: "Branding",
    year: "[2026]",
    image: tote,
    alt: "A woman in a market carrying a tote with a green print",
    size: "tall",
    draft: true,
  },
  {
    id: "mall-activation",
    title: "Mall activation",
    client: "[Client]",
    discipline: "Spaces",
    year: "[2026]",
    image: activation,
    alt: "A green brand booth in a mall seen from an upper floor",
    size: "wide",
    draft: true,
  },
  {
    id: "website",
    title: "Website",
    client: "[Client]",
    discipline: "Digital",
    year: "[2026]",
    image: website,
    alt: "A laptop showing a green and bone website in a studio",
    size: "square",
    draft: true,
  },
  {
    id: "delivery-fleet",
    title: "Delivery fleet branding",
    client: "[Client]",
    discipline: "Outdoor",
    year: "[2026]",
    image: delivery,
    alt: "A delivery motorbike with a green branded box in motion",
    size: "wide",
    draft: true,
  },
  {
    id: "hoardings",
    title: "Site hoardings",
    client: "[Client]",
    discipline: "Outdoor",
    year: "[2026]",
    image: hoarding,
    alt: "Green and bone hoardings along a New Cairo sidewalk",
    size: "square",
    caseId: "outdoor-real-estate",
    draft: true,
  },
  {
    id: "overpass-billboard",
    title: "Overpass billboard",
    client: "[Client]",
    discipline: "Campaigns",
    year: "[2026]",
    image: billboardDusk,
    alt: "A lit billboard over a Cairo overpass at blue hour",
    size: "wide",
    draft: true,
  },
  {
    id: "cafe-service",
    title: "Counter and cups",
    client: "[Client]",
    discipline: "Packaging",
    year: "[2026]",
    image: cafeCounter,
    alt: "A cup in a green sleeve passed across a tiled counter",
    size: "square",
    caseId: "three-branches-one-brand",
    draft: true,
  },
  {
    id: "retail-interior",
    title: "Store interior",
    client: "[Client]",
    discipline: "Spaces",
    year: "[2026]",
    image: retail,
    alt: "A clothing store with green shelving seen through the window",
    size: "wide",
    caseId: "growth-retail",
    draft: true,
  },
];
