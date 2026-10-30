import { org } from "../data/site";

export type Crumb = { name: string; path: string };
type Json = Record<string, unknown>;

/** Absolute URL when SITE_URL is set; root-relative otherwise. */
export const abs = (path: string, site?: URL) => (site ? new URL(path, site).href : path);

export function organization(site?: URL): Json[] {
  const base = {
    name: org.name,
    url: abs("/", site),
    logo: abs("/brand/massar_lockup_green.png", site),
    email: org.email,
    description: org.description,
    ...(org.sameAs.length ? { sameAs: org.sameAs } : {}),
  };
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": abs("/#org", site),
      ...base,
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      ...base,
      areaServed: org.areaServed.map((name) => ({ "@type": "Place", name })),
      address: { "@type": "PostalAddress", addressLocality: "Cairo", addressCountry: "EG" },
    },
  ];
}

export const faqPage = (faqs: { q: string; a: string }[]): Json => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export const breadcrumbList = (crumbs: Crumb[], site?: URL): Json => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: abs(c.path, site),
  })),
});

export const article = (
  a: {
    headline: string;
    description: string;
    path: string;
    image: string;
    published: Date;
    modified: Date;
    about?: string;
  },
  site?: URL,
): Json => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: a.headline,
  description: a.description,
  url: abs(a.path, site),
  image: abs(a.image, site),
  datePublished: a.published.toISOString(),
  dateModified: a.modified.toISOString(),
  author: { "@type": "Organization", name: org.name, url: abs("/", site) },
  publisher: { "@type": "Organization", name: org.name, url: abs("/", site) },
  ...(a.about ? { about: { "@type": "Organization", name: a.about } } : {}),
});
