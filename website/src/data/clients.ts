/**
 * Clients wall. Every name, sector and logo is a placeholder until Ali
 * confirms who can be named. Set `logo` to an imported image when real
 * logos arrive; `caseId` links a client to its case study.
 */
import type { ImageMetadata } from "astro";

export type Client = {
  name: string;
  sector: string;
  logo?: ImageMetadata;
  caseId?: string;
};

export const clients: Client[] = [
  { name: "[Client]", sector: "[Food & beverage]", caseId: "three-branches-one-brand" },
  { name: "[Client]", sector: "[Real estate]", caseId: "outdoor-real-estate" },
  { name: "[Client]", sector: "[Healthcare]", caseId: "campaign-healthcare" },
  { name: "[Client]", sector: "[Retail]", caseId: "growth-retail" },
  { name: "[Client]", sector: "[Hospitality]" },
  { name: "[Client]", sector: "[Education]" },
  { name: "[Client]", sector: "[Fintech]" },
  { name: "[Client]", sector: "[Industrial]" },
  { name: "[Client]", sector: "[Food & beverage]" },
  { name: "[Client]", sector: "[Real estate]" },
  { name: "[Client]", sector: "[Retail]" },
  { name: "[Client]", sector: "[Healthcare]" },
];

/** Placeholder testimonials: only real, approved quotes go here. */
export const testimonials = [
  {
    text: "[A sentence from the client, in their words, approved.]",
    name: "[Name]",
    role: "[Title, Client]",
  },
  {
    text: "[What changed for their business, in one or two sentences.]",
    name: "[Name]",
    role: "[Title, Client]",
  },
];
