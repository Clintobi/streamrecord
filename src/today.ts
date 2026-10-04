// Background + today: the 2023 lab band is the stream's background; rainfall in the last 72 h is today's condition.
// The 72-hour window follows the EU Bathing Water Directive's "short-term pollution" (2006/7/EC, Art. 2);
// rain-based public advice has run on Scotland's beach signs since 2004. Thresholds are borrowed from
// bathing-water practice and are not calibrated for these streams; the page says so.

export type RainLevel = 'dry' | 'some' | 'flush'
export type Action = 0 | 1 | 2 | 3 // usual care · be aware · be prepared · avoid contact today

export interface RainState {
  level: RainLevel
  sum24: number
  sum72: number
  days: [number, number, number] // mm in the last 0-24 h, 24-48 h, 48-72 h
  lastWet: string | null // ISO local hour of the last hour with >= 1 mm
  windowEnds: string | null // lastWet + 72 h, when level is not dry
  hoursLeft: number | null
}

export const SOME_MM = 2
export const FLUSH_MM = 5
export const WINDOW_H = 72

// hourly: oldest first, the last 72 hours up to now
export function rainState(times: string[], mm: (number | null)[], now = new Date()): RainState {
  const v = mm.map((x) => x ?? 0)
  const n = v.length
  const sum = (a: number, b: number) => +v.slice(Math.max(0, n - b), n - a).reduce((s, x) => s + x, 0).toFixed(1)
  const sum24 = sum(0, 24), sum72 = sum(0, 72)
  const days: [number, number, number] = [sum24, sum(24, 48), sum(48, 72)]
  let li = -1
  for (let i = n - 1; i >= 0; i--) if (v[i] >= 1) { li = i; break }
  const lastWet = li >= 0 ? times[li] : null
  const level: RainLevel = sum72 >= FLUSH_MM ? 'flush' : sum72 >= SOME_MM ? 'some' : 'dry'
  let windowEnds: string | null = null, hoursLeft: number | null = null
  if (level !== 'dry' && lastWet) {
    const end = new Date(Date.parse(lastWet + (lastWet.length === 16 ? ':00' : '')) + WINDOW_H * 3600e3)
    windowEnds = end.toISOString()
    hoursLeft = Math.max(0, Math.round((end.getTime() - Date.parse(times[n - 1] + (times[n - 1].length === 16 ? ':00' : ''))) / 3600e3))
  }
  void now
  return { level, sum24, sum72, days, lastWet, windowEnds, hoursLeft }
}

// rows: our 2023 band (unknown is treated like the middle band: untested, not reassuring); columns: rain level
const GRID: Record<string, [Action, Action, Action]> = {
  low: [0, 1, 2],
  moderate: [1, 2, 3],
  high: [2, 3, 3],
  unknown: [1, 2, 3],
}
export function actionFor(band: string | undefined, rain: RainLevel): Action {
  return (GRID[band && band in GRID ? band : 'unknown'])[rain === 'dry' ? 0 : rain === 'some' ? 1 : 2]
}
export const GRID_ROWS = ['low', 'moderate', 'high', 'unknown'] as const
export const gridCell = (band: string, i: 0 | 1 | 2) => GRID[band][i]

export async function fetchRain(lat: number, lon: number, signal?: AbortSignal): Promise<RainState | null> {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&past_hours=72&forecast_hours=0&timezone=auto`
    const r = await fetch(u, { signal })
    if (!r.ok) return null
    const j = await r.json()
    const t: string[] = j?.hourly?.time, p: (number | null)[] = j?.hourly?.precipitation
    if (!Array.isArray(t) || !Array.isArray(p) || t.length < 24) return null
    return rainState(t, p)
  } catch { return null }
}

// demonstration override (#/site/C6?rain=12): the given mm fall six hours ago, so the window can be shown on a dry day
export function demoRain(mm: number): RainState {
  const now = Date.now()
  const t = Array.from({ length: 72 }, (_, i) => new Date(now - (71 - i) * 3600e3).toISOString().slice(0, 13) + ':00')
  const p = Array(72).fill(0); p[65] = mm
  return rainState(t, p)
}
