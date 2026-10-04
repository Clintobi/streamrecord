import { Check } from './model'

const KEY = 'streamrecord.checks.v1'

function read(): Check[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Check[] } catch { return [] }
}
function write(all: Check[]) {
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* storage unavailable: keep in memory only */ }
}

export function checksFor(siteId: string): Check[] {
  return read().filter((c) => c.siteId === siteId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export function saveCheck(c: Check) { const all = read(); all.push(c); write(all) }
export function allChecks(): Check[] { return read() }
