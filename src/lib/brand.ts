/**
 * One codebase, one deployment per company. NEXT_PUBLIC_BRAND picks which
 * company this deployment is: its name, logo and (through
 * html[data-brand] in globals.css) its colours and fonts. Each deployment
 * has its own Supabase project, so no data is shared.
 */
const BRANDS = {
  massar: {
    key: 'massar',
    name: 'Massar',
    logo: '/image/massar_logo.svg',
    tagline: 'ONE PARTNER. ONE PATH.',
    // Today: what waits for a partner comes first
    todayOrder: ['check', 'late', 'client'],
    todayStats: false,
    spacesView: 'cards',
    credit: null,
  },
  mie: {
    key: 'mie',
    name: 'MIE',
    logo: '/brand/mie/logo.png',
    tagline: 'WE BUILD PRESENCE THAT SELLS.',
    // MIE leads with what is late, shows the day's numbers first, and lists clients as rows
    todayOrder: ['late', 'check', 'client'],
    todayStats: true,
    spacesView: 'rows',
    credit: 'Developed by Massar',
  },
} as const satisfies Record<string, {
  key: string
  name: string
  logo: string
  tagline: string
  todayOrder: readonly ('check' | 'late' | 'client')[]
  todayStats: boolean
  spacesView: 'cards' | 'rows'
  credit: string | null
}>

export type BrandKey = keyof typeof BRANDS

export const BRAND = BRANDS[(process.env.NEXT_PUBLIC_BRAND as BrandKey) in BRANDS ? (process.env.NEXT_PUBLIC_BRAND as BrandKey) : 'massar']
