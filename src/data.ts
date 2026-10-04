import { CityIndex, Site } from './model'

let cities: Promise<CityIndex[]> | null = null
const cache = new Map<string, Promise<Site[]>>()

export function loadCities(): Promise<CityIndex[]> {
  if (!cities) cities = fetch('./data/cities.json').then((r) => r.json())
  return cities
}
export function loadCity(slug: string): Promise<Site[]> {
  // ENORA publishes two Toulouse sites (T21, T24) with an empty name; show the code instead of a blank
  if (!cache.has(slug)) cache.set(slug, fetch(`./data/sites-${slug}.json`).then((r) => r.json()).then((all: Site[]) => all.map((s) => (s.name?.trim() ? s : { ...s, name: `Site ${s.id}`, unnamed: true }))))
  return cache.get(slug)!
}
export async function findSite(id: string): Promise<{ site: Site; city: CityIndex; sites: Site[] } | null> {
  for (const c of await loadCities()) {
    const sites = await loadCity(c.slug)
    const site = sites.find((s) => s.id === id)
    if (site) return { site, city: c, sites }
  }
  return null
}

export interface Library {
  policyBrief?: { url?: string; date?: string; title?: string; quotes: { text: string; page: number | string }[] }
  indicators?: { key: string; title: string; explanation: string; source: { record: string; file?: string; page?: number | string; url?: string }; supportingQuote?: string }[]
  measures?: { id: string; name: string; category?: string; oneLine: string; page: number | string; pdfPage?: number; quote?: string; addresses: string[] }[]
  cityWhy?: { text: string; page: number | string }[]
  unsourced?: string[]
  addressesNote?: string
  sources?: Record<string, { title: string; url: string }>
}
let lib: Promise<Library> | null = null
export function loadLibrary(): Promise<Library> {
  if (!lib) lib = fetch('./data/library.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
  return lib
}

export interface Bands { n: number; tertile1: number; tertile2: number; min: number; max: number }
let bands: Promise<Bands | null> | null = null
export function loadBands(): Promise<Bands | null> {
  if (!bands) bands = fetch('./data/bands.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
  return bands
}
