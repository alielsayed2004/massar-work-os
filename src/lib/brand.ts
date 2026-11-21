/**
 * One codebase, one deployment per company. NEXT_PUBLIC_BRAND picks which
 * company this deployment is: its name, logo and (through
 * html[data-brand] in globals.css) its colours and fonts. Each deployment
 * has its own Supabase project, so no data is shared.
 */
const BRANDS = {
  massar: { key: 'massar', name: 'Massar', logo: '/image/massar_logo.svg', tagline: 'ONE PARTNER. ONE PATH.' },
  mie: { key: 'mie', name: 'MIE', logo: '/brand/mie/logo.png', tagline: 'WE BUILD PRESENCE THAT SELLS.' },
} as const

export type BrandKey = keyof typeof BRANDS

export const BRAND = BRANDS[(process.env.NEXT_PUBLIC_BRAND as BrandKey) in BRANDS ? (process.env.NEXT_PUBLIC_BRAND as BrandKey) : 'massar']
