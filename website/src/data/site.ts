/** Site-wide copy and facts. Anything in [brackets] is waiting for Ali. */

export const org = {
  name: "Massar",
  description:
    "Massar is an integrated creative and business partner in Egypt for startups and SMEs. One team handles strategy, branding, marketing and execution against one business objective.",
  email: "brand@massar.agency",
  tagline: "One partner. One path.",
  areaServed: ["Egypt", "GCC"],
  /** Social profile URLs for JSON-LD sameAs — waiting for Ali. */
  sameAs: [] as string[],
};

export const nav = [
  { href: "/work", label: "Work" },
  { href: "/#problems", label: "Problems we solve" },
  { href: "/process", label: "Process" },
  { href: "/#faq", label: "FAQ" },
];

export const services = [
  {
    name: "Digital & outdoor marketing",
    line: "Campaigns, content, media and outdoor, planned as one push.",
  },
  {
    name: "Business development",
    line: "Offer, pricing, partnerships and the sales path that turns attention into revenue.",
  },
  {
    name: "Brand & solutions",
    line: "Strategy, identity and the systems that keep every touchpoint consistent.",
  },
  {
    name: "Consulting",
    line: "An outside read on the business problem before you spend on the fix.",
  },
];

/** Disciplines that scroll in the home marquee. */
export const disciplines = [
  "Brand strategy",
  "Identity",
  "Campaigns",
  "Outdoor",
  "Digital marketing",
  "Content",
  "Business development",
  "Consulting",
];

export const beforeAfter = {
  before: [
    "Five suppliers, five briefs, five invoices",
    "Every channel says something different",
    "Spend goes up, results stay flat",
    "Nobody owns the number",
  ],
  after: [
    "One partner, one brief, one plan",
    "One message across every touchpoint",
    "Spend only where it moves the objective",
    "One accountable owner, reported plainly",
  ],
};

export const processSteps = [
  { name: "Diagnose", line: "Find what's really blocking growth." },
  { name: "Direct", line: "One objective, in numbers, in writing." },
  { name: "Build", line: "Only the disciplines that serve it." },
  { name: "Prove", line: "Measure it and report it plainly." },
  { name: "Next step", line: "Decide together what comes after." },
];

export const homeFaqs = [
  { q: "What does Massar do?", a: org.description },
  {
    q: "How long does a branding project take?",
    a: "[Typical timeline in weeks, and what changes it.]",
  },
  { q: "Do you work outside Egypt?", a: "[Where Massar works today and how remote work runs.]" },
  { q: "Who is accountable for results?", a: "[Who owns the result and how it is reported.]" },
];

export const caseTags = ["Branding", "Campaigns", "Outdoor", "Growth"] as const;
export type CaseTag = (typeof caseTags)[number];
