// Validates every resource in a real StreamRecord bundle against FHIR R4 on public servers, and records the results.
import { writeFileSync, readFileSync } from 'node:fs'
import { buildBundle } from '../src/fhir'
import type { Check, Site } from '../src/model'

const sites = JSON.parse(readFileSync('public/data/sites-coimbra.json', 'utf8')) as Site[]
const site = sites.find((s) => s.id === 'C1') || sites[0]
const check: Check = {
  id: 'C1-evidence', siteId: site.id, createdAt: '2026-10-04T12:00:00Z', status: 'preliminary',
  answers: { foam: 'present', colourSmell: 'unsure', riparianVegetation: '21-40-percent', macrophytes: '41-60-percent', invasiveOrganisms: 'absent', other: ['scum'], waterTemperature: 18.5 },
}
const bundle = buildBundle(site, check)
writeFileSync('evidence/sample-bundle.json', JSON.stringify(bundle, null, 2))

const servers = ['https://hapi.fhir.org/baseR4', 'https://sandbox.hl7europe.eu/oneaquahealth/fhir']
const rows: any[] = []
for (const server of servers) {
  const seen = new Set<string>()
  for (const e of bundle.entry) {
    const r = { ...e.resource }
    // the public servers do not hold the OAH IG, so a declared profile cannot be resolved there;
    // validate against base R4 and check location-oah's rules in src/fhir.test.ts instead
    const profile = r.meta?.profile?.[0]
    if (profile) delete r.meta
    const type = r.resourceType
    // validate one of each type, plus every Observation variant (coded, not-sure, quantity, multi)
    const key = type === 'Observation' ? `${type}:${r.code.coding[0].code}` : type
    if (seen.has(key)) continue
    seen.add(key)
    // internal urn:uuid references are only resolvable inside the transaction; validate the resource content
    const res = await fetch(`${server}/${type}/$validate`, { method: 'POST', headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' }, body: JSON.stringify(r) })
    const oo = await res.json().catch(() => ({}))
    const issues = (oo.issue || []) as any[]
    const errors = issues.filter((i) => i.severity === 'error' || i.severity === 'fatal')
    const warnings = issues.filter((i) => i.severity === 'warning')
    rows.push({ resource: key, server, note: profile ? `base R4; ${profile.split('/').pop()} rules checked by unit test (IG not on server)` : 'base R4', http: res.status, errors: errors.length, warnings: warnings.length, at: new Date().toISOString(),
      errorText: errors.map((i) => i.diagnostics).slice(0, 5), warningText: warnings.map((i) => i.diagnostics).slice(0, 5) })
    console.log(res.status, key, 'errors', errors.length, 'warnings', warnings.length, errors.map((i) => i.diagnostics).join(' | ').slice(0, 300))
  }
}
// whole transaction bundle, so internal urn:uuid references are checked too
{
  const b = JSON.parse(JSON.stringify(bundle))
  for (const e of b.entry) delete e.resource.meta
  const res = await fetch(`${servers[0]}/Bundle/$validate`, { method: 'POST', headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' }, body: JSON.stringify(b) })
  const issues = (((await res.json().catch(() => ({}))) as any).issue || []) as any[]
  const errors = issues.filter((i) => i.severity === 'error' || i.severity === 'fatal'), warnings = issues.filter((i) => i.severity === 'warning')
  rows.push({ resource: 'Bundle (transaction, all entries)', server: servers[0], note: 'base R4', http: res.status, errors: errors.length, warnings: warnings.length, at: new Date().toISOString(),
    errorText: errors.map((i) => i.diagnostics).slice(0, 5), warningText: [...new Set(warnings.map((i) => String(i.diagnostics).slice(0, 80)))] })
  console.log(res.status, 'Bundle errors', errors.length, 'warnings', warnings.length)
}
writeFileSync('evidence/validate.json', JSON.stringify(rows, null, 2))
