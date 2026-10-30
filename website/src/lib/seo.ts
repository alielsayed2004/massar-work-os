import { org } from "../data/site";

export type Crumb = { name: string; path: string };
type Json = Record<string, unknown>;

/** Absolute URL when SITE_URL is set; root-relative otherwise. */
export const abs = (path: string, site?: URL) => (site ? new URL(path, site).href : path);

/** Stable id so every page can point at the same organisation entity. */
export const orgId = (site?: URL) => abs("/#org", site);
const orgRef = (site?: URL) => ({ "@id": orgId(site) });

/** Organization + WebSite: emitted on every page. */
export function siteEntities(site?: URL): Json[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": orgId(site),
      name: org.name,
      alternateName: "Massar Agency",
      url: abs("/", site),
      logo: abs("/brand/massar_lockup_green.png", site),
      email: org.email,
      description: org.description,
      slogan: org.tagline,
      areaServed: org.areaServed.map((name) => ({ "@type": "Place", name })),
      knowsAbout: [
        "Brand strategy",
        "Brand identity",
        "Digital marketing",
        "Outdoor advertising",
        "Business development",
        "Marketing consulting",
      ],
      ...(org.sameAs.length ? { sameAs: org.sameAs } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": abs("/#website", site),
      name: org.name,
      url: abs("/", site),
      inLanguage: "en",
      publisher: orgRef(site),
    },
  ];
}

/** The local business entity (home and about). */
export function professionalService(site?: URL): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: org.name,
    url: abs("/", site),
    image: abs("/brand/massar_lockup_green.png", site),
    email: org.email,
    description: org.description,
    parentOrganization: orgRef(site),
    areaServed: org.areaServed.map((name) => ({ "@type": "Place", name })),
    address: { "@type": "PostalAddress", addressLocality: "Cairo", addressCountry: "EG" },
  };
}

export const serviceList = (
  services: readonly { id: string; name: string; line: string; includes: readonly string[] }[],
  site?: URL,
): Json => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Massar services",
  itemListElement: services.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Service",
      "@id": abs(`/services#${s.id}`, site),
      name: s.name,
      serviceType: s.name,
      description: `${s.line} Includes: ${s.includes.join(", ")}.`,
      provider: orgRef(site),
      areaServed: org.areaServed.map((name) => ({ "@type": "Place", name })),
      url: abs(`/services#${s.id}`, site),
    },
  })),
});

export const itemList = (
  name: string,
  items: { name: string; path: string }[],
  site?: URL,
): Json => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    url: abs(it.path, site),
  })),
});

export const howTo = (
  name: string,
  description: string,
  steps: readonly { name: string; line: string; does?: string }[],
  site?: URL,
): Json => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name,
  description,
  step: steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: [s.line, s.does].filter(Boolean).join(" "),
    url: abs(`/process#step-${i + 1}`, site),
  })),
});

export const aboutPage = (site?: URL): Json => ({
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Massar",
  url: abs("/about", site),
  about: orgRef(site),
});

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
  mainEntityOfPage: abs(a.path, site),
  inLanguage: "en",
  author: orgRef(site),
  publisher: orgRef(site),
  ...(a.about ? { about: { "@type": "Organization", name: a.about } } : {}),
});
