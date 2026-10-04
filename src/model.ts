// Data model, field-check definition and finding logic.

export type RiskLevel = 'low' | 'moderate' | 'high' | 'unknown'

export interface Site {
  id: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  unnamed?: boolean // ENORA published no name; `name` holds a fallback
  risk?: { level: RiskLevel; score?: number | null; date?: string | null; label?: string | null; parts?: { scaledPathogenRisk?: number | null; scaledFecalRisk?: number | null; scaledArgRisk?: number | null } } | null
}

export interface CityIndex {
  slug: string
  name: string
  country: string
  lang: string // default UI language for the city
  center: [number, number]
  count: number
}

// FHIR code systems
export const OAH_CS = 'http://hl7.eu/fhir/ig/oah/CodeSystem/temporarySystem-oah-eu'
export const LOCAL_CS = 'https://streamrecord.vercel.app/fhir/CodeSystem/streamrecord-local'
export const DAR_CS = 'http://terminology.hl7.org/CodeSystem/data-absent-reason'

export type QKind = 'presence' | 'band' | 'multi' | 'temperature'

export interface QuestionDef {
  key: string
  kind: QKind
  // the observation code for this question
  code: { system: string; code: string }
  options: string[] // answer keys, "Not sure" is added by the UI
  optional?: boolean
}

export const BANDS = ['0-20-percent', '21-40-percent', '41-60-percent', '61-80-percent', '81-100-percent']

export const QUESTIONS: QuestionDef[] = [
  { key: 'foam', kind: 'presence', code: { system: OAH_CS, code: 'foam' }, options: ['present', 'absent'] },
  { key: 'colourSmell', kind: 'presence', code: { system: LOCAL_CS, code: 'colourSmell' }, options: ['present', 'absent'] },
  { key: 'riparianVegetation', kind: 'band', code: { system: OAH_CS, code: 'riparianVegetation' }, options: BANDS },
  { key: 'macrophytes', kind: 'band', code: { system: OAH_CS, code: 'macrophytes' }, options: BANDS },
  { key: 'invasiveOrganisms', kind: 'presence', code: { system: OAH_CS, code: 'invasiveOrganisms' }, options: ['present', 'absent'] },
  { key: 'other', kind: 'multi', code: { system: LOCAL_CS, code: 'otherSigns' }, options: ['scum', 'deadFish', 'standingWater', 'none'] },
  { key: 'waterTemperature', kind: 'temperature', code: { system: OAH_CS, code: 'waterTemperature' }, options: [], optional: true },
]

// Answer value: string for single choice, string[] for multi, number for temperature,
// 'unsure' for Not sure, null for a skipped optional question.
export type Answer = string | string[] | number | 'unsure' | null
export type Answers = Record<string, Answer>

export type CheckStatus = 'preliminary' | 'final' | 'entered-in-error'

export interface Review {
  decision: 'final' | 'entered-in-error'
  reason: string
  reviewer: string
  at: string
}

export interface Check {
  id: string
  siteId: string
  createdAt: string
  answers: Answers
  status: CheckStatus
  review?: Review
  sample?: boolean // synthetic check added from the review screen so the flow can be tried
}

// Our own second-look rules (not OneAquaHealth's): reports a person should confirm before they count.
export const SECOND_LOOK = ['deadFish', 'coldScum', 'hotWater', 'mostlyUnsure'] as const
export function secondLook(a: Answers): string[] {
  const out: string[] = []
  const other = Array.isArray(a.other) ? a.other : []
  const temp = typeof a.waterTemperature === 'number' ? a.waterTemperature : null
  if (other.includes('deadFish')) out.push('deadFish')
  if (other.includes('scum') && temp !== null && temp < 10) out.push('coldScum')
  if (temp !== null && temp > 30) out.push('hotWater')
  if (QUESTIONS.filter((q) => q.kind !== 'temperature' && a[q.key] === 'unsure').length >= 4) out.push('mostlyUnsure')
  return out
}

export const FINDING_ORDER = ['scum', 'deadFish', 'colourSmell', 'foam', 'standingWater', 'invasiveOrganisms', 'riparianVegetation', 'macrophytes']

// Which findings a single check raises. Conservative: only clear reports raise a finding.
export function findingsFromAnswers(a: Answers): string[] {
  const out = new Set<string>()
  if (a.foam === 'present') out.add('foam')
  if (a.colourSmell === 'present') out.add('colourSmell')
  if (a.invasiveOrganisms === 'present') out.add('invasiveOrganisms')
  if (a.riparianVegetation === '0-20-percent' || a.riparianVegetation === '21-40-percent') out.add('riparianVegetation')
  if (a.macrophytes === '0-20-percent') out.add('macrophytes')
  if (Array.isArray(a.other)) for (const s of a.other) if (s !== 'none') out.add(s)
  return FINDING_ORDER.filter((f) => out.has(f))
}

// Rejected checks (entered-in-error) no longer count.
export function findingsFromChecks(checks: Check[]): string[] {
  const all = new Set<string>()
  for (const c of checks) if (c.status !== 'entered-in-error') for (const f of findingsFromAnswers(c.answers)) all.add(f)
  return FINDING_ORDER.filter((f) => all.has(f))
}

// Findings at least one confirmed (final) check reported.
export function confirmedFindings(checks: Check[]): Set<string> {
  const out = new Set<string>()
  for (const c of checks) if (c.status === 'final') for (const f of findingsFromAnswers(c.answers)) out.add(f)
  return out
}

export type Status = 'ok' | 'look' | 'concern' | 'none'

export function labStatus(site: Site): Status {
  const l = site.risk?.level
  if (l === 'low') return 'ok'
  if (l === 'moderate') return 'look'
  if (l === 'high') return 'concern'
  return 'none'
}

export function daysSince(dateIso?: string | null, now = new Date()): number | null {
  if (!dateIso) return null
  const t = Date.parse(dateIso)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((now.getTime() - t) / 86400000))
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

// "28 Jun 2023" in the reader's language; falls back to the ISO date.
export function longDate(iso?: string | null, lang = 'en'): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleDateString(lang === 'no' ? 'nb' : lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Great-circle distance in km.
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// For a high-scoring site: the nearest sites in the same city whose lab score is in our low third.
export function lowerNearby(site: Site, sites: Site[], n = 3): { site: Site; km: number }[] {
  if (site.risk?.level !== 'high') return []
  return sites.filter((s) => s.id !== site.id && s.risk?.level === 'low')
    .map((s) => ({ site: s, km: distanceKm(site, s) }))
    .sort((a, b) => a.km - b.km).slice(0, n)
}
