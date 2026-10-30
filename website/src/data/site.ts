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
  { href: "/problems", label: "Problems" },
  { href: "/services", label: "Services" },
  { href: "/process", label: "Process" },
  { href: "/about", label: "About" },
];

/**
 * The four services. `includes` and `line` are positioning copy for Ali to
 * review; `problems` and `tags` link each service to the problems it solves
 * and the case-study tags it shows.
 */
export const services = [
  {
    id: "marketing",
    name: "Digital & outdoor marketing",
    line: "Campaigns, content, media and outdoor, planned as one push.",
    includes: [
      "Campaign strategy and creative",
      "Content and social media",
      "Paid media planning and buying",
      "Outdoor, signage and activations",
    ],
    problems: ["ads-run-nobody-buys", "launching-need-it-all"],
    tags: ["Campaigns", "Outdoor"],
  },
  {
    id: "business-development",
    name: "Business development",
    line: "Offer, pricing, partnerships and the sales path that turns attention into revenue.",
    includes: [
      "Offer and pricing review",
      "Sales funnel and customer journey",
      "Partnerships and new channels",
      "Growth plan with numbers attached",
    ],
    problems: ["ads-run-nobody-buys", "five-suppliers-no-one-accountable"],
    tags: ["Growth"],
  },
  {
    id: "brand",
    name: "Brand & solutions",
    line: "Strategy, identity and the systems that keep every touchpoint consistent.",
    includes: [
      "Brand strategy and positioning",
      "Identity, naming and voice",
      "Brand guidelines and templates",
      "Packaging, spaces and signage",
    ],
    problems: ["brand-looks-different", "launching-need-it-all"],
    tags: ["Branding"],
  },
  {
    id: "consulting",
    name: "Consulting",
    line: "An outside read on the business problem before you spend on the fix.",
    includes: [
      "Diagnosis workshop",
      "Market and competitor read",
      "One objective, in numbers",
      "A plan you can run with or without us",
    ],
    problems: ["five-suppliers-no-one-accountable", "brand-looks-different"],
    tags: [],
  },
] as const;

/** The five stations of the path. `does` and `get` are copy for Ali to review; `[time]` waits for him. */
export const processSteps = [
  {
    name: "Diagnose",
    line: "Find what's really blocking growth.",
    does: "We look at the business before the marketing: numbers, customers, competitors and what has been tried.",
    get: "A written diagnosis: the real problem, in one page.",
    time: "[0 weeks]",
  },
  {
    name: "Direct",
    line: "One objective, in numbers, in writing.",
    does: "We agree one objective with you and the few moves that will get there. Everything else waits.",
    get: "One objective, a plan and a budget, signed off together.",
    time: "[0 weeks]",
  },
  {
    name: "Build",
    line: "Only the disciplines that serve it.",
    does: "Brand, content, campaigns, outdoor or sales tools: we make only what the objective needs, in the right order.",
    get: "The work itself, delivered by one team on one timeline.",
    time: "[0 weeks]",
  },
  {
    name: "Prove",
    line: "Measure it and report it plainly.",
    does: "We track the number we agreed on and report what moved, what didn't and why.",
    get: "A plain report: the number, the period and the source.",
    time: "[ongoing]",
  },
  {
    name: "Next step",
    line: "Decide together what comes after.",
    does: "With the result in hand, we decide together: scale it, fix it or move to the next problem.",
    get: "The next objective, or a clean handover.",
    time: "[0 weeks]",
  },
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
