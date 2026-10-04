// One clearly tagged test: POST a confirmed StreamRecord check to the OneAquaHealth FHIR sandbox, then read it back.
import { readFileSync, writeFileSync } from 'node:fs'
import { buildBundle } from '../src/fhir'
import type { Check, Site } from '../src/model'

const BASE = 'https://sandbox.hl7europe.eu/oneaquahealth/fhir'
const TAG = { system: 'https://streamrecord.vercel.app/fhir/tag', code: 'hackathon-test', display: 'StreamRecord hackathon test record (OneAquaHealth IEEE Hackathon 2026)' }
const site = (JSON.parse(readFileSync('public/data/sites-coimbra.json', 'utf8')) as Site[]).find((s) => s.id === 'C1')!
const at = new Date().toISOString()
const check: Check = {
  id: `sandbox-test-${at}`, siteId: 'C1', createdAt: at, status: 'final',
  answers: { foam: 'present', colourSmell: 'absent', riparianVegetation: '21-40-percent', macrophytes: '41-60-percent', invasiveOrganisms: 'absent', other: ['none'], waterTemperature: 17.5 },
  review: { decision: 'final', reason: 'Hackathon round-trip test: synthetic answers, not a real observation', reviewer: 'StreamRecord team', at },
}
const bundle = buildBundle(site, check)
for (const e of bundle.entry) e.resource.meta = { ...(e.resource.meta || {}), tag: [TAG] }

const post = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' }, body: JSON.stringify(bundle) })
const resp = await post.json()
console.log('POST', post.status, resp.resourceType, resp.type)
const created = (resp.entry || []).map((e: any) => ({ status: e.response?.status, location: e.response?.location }))
for (const c of created) console.log(' ', c.status, c.location)

// read back: every created resource, then a search by our tag
const readBack: any[] = []
for (const c of created) {
  const ref = String(c.location || '').split('/_history')[0]
  if (!ref) continue
  const r = await fetch(`${BASE}/${ref}`, { headers: { Accept: 'application/fhir+json' } })
  const j = await r.json()
  readBack.push({ ref, http: r.status, resourceType: j.resourceType, status: j.status, profile: j.meta?.profile, tag: j.meta?.tag?.[0]?.code })
}
const search = await fetch(`${BASE}/Observation?_tag=${encodeURIComponent(TAG.system + '|' + TAG.code)}&_summary=count`, { headers: { Accept: 'application/fhir+json' } })
const count = (await search.json()).total
console.log('read back', readBack.filter((r) => r.http === 200).length, 'of', readBack.length, '; Observations with our tag on the server:', count)
writeFileSync('evidence/sandbox-roundtrip.json', JSON.stringify({ server: BASE, at, tag: TAG, postHttp: post.status, created, readBack, tagSearchObservationCount: count }, null, 2))
