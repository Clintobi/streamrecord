// Builds a FHIR R4 transaction Bundle for one citizen check:
// Location (the site), QuestionnaireResponse, one Observation per answer, a Device (the app) and Provenance.
import { Check, DAR_CS, LOCAL_CS, OAH_CS, QUESTIONS, Site } from './model'

export const IG = {
  // Pinned per fhir/ig.lock. Profiles are only declared in meta.profile once verified to exist at this commit.
  commit: 'b907cf0',
  package: 'hl7.eu.fhir.oah#0.1.0-ci-build',
}

export const LOCATION_OAH = 'http://hl7.eu/fhir/ig/oah/StructureDefinition/location-oah'
export const SITE_ID_SYSTEM = 'https://api.enora-oah.eu/api/sites'
export const QUESTIONNAIRE = 'https://streamrecord.vercel.app/fhir/Questionnaire/streamrecord-check|0.1.0'
export const CATEGORY = { system: LOCAL_CS, code: 'citizen-science', display: 'Citizen science' }

type R = Record<string, any>

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const narrative = (text: string) => ({ status: 'generated', div: `<div xmlns="http://www.w3.org/1999/xhtml">${esc(text)}</div>` })

function uuid(seed: string): string {
  // deterministic v4-shaped id from a seed, so tests and re-sends are stable
  let h1 = 0x811c9dc5, h2 = 0x01000193
  for (let i = 0; i < seed.length; i++) { h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619); h2 = Math.imul(h2 ^ seed.charCodeAt(i), 2246822519) }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  const s = (hex(h1) + hex(h2) + hex(h1 ^ h2) + hex(Math.imul(h2, 31) ^ h1)).slice(0, 32)
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`
}

export function valueFor(qKey: string, ans: unknown): R {
  if (ans === 'unsure') return { dataAbsentReason: { coding: [{ system: DAR_CS, code: 'asked-unknown', display: 'Asked But Unknown' }] } }
  const q = QUESTIONS.find((x) => x.key === qKey)!
  if (q.kind === 'temperature') return { valueQuantity: { value: ans as number, unit: '°C', system: 'http://unitsofmeasure.org', code: 'Cel' } }
  if (q.kind === 'multi') {
    const codes = (ans as string[]).map((c) => ({ system: LOCAL_CS, code: c }))
    return { valueCodeableConcept: { coding: codes, text: (ans as string[]).join(', ') } }
  }
  // presence and band answers use OAH codes (present/absent, NN-NN-percent)
  return { valueCodeableConcept: { coding: [{ system: OAH_CS, code: ans as string }] } }
}

export function buildBundle(site: Site, check: Check): R {
  const locId = uuid('loc' + site.id)
  const qrId = uuid('qr' + check.id)
  const devId = uuid('device-streamrecord')
  const entries: R[] = []

  const location: R = {
    resourceType: 'Location',
    // location-oah verified at the pinned IG commit (identifier 1.., name 1.., mode = instance)
    meta: { profile: [LOCATION_OAH] },
    text: narrative(`${site.name}, ${site.city} (OneAquaHealth site ${site.id})`),
    identifier: [{ system: SITE_ID_SYSTEM, value: site.id }],
    status: 'active',
    name: site.name,
    mode: 'instance',
    address: { city: site.city, country: site.country },
    position: { longitude: site.lon, latitude: site.lat },
  }
  entries.push({ fullUrl: `urn:uuid:${locId}`, resource: location,
    request: { method: 'POST', url: 'Location', ifNoneExist: `identifier=${SITE_ID_SYSTEM}|${site.id}` } })

  const answered = QUESTIONS.filter((q) => check.answers[q.key] !== undefined && check.answers[q.key] !== null)

  const qr: R = {
    resourceType: 'QuestionnaireResponse',
    text: narrative(`StreamRecord check at site ${site.id}, ${check.createdAt}`),
    questionnaire: QUESTIONNAIRE,
    status: 'completed',
    subject: { reference: `urn:uuid:${locId}` },
    authored: check.createdAt,
    item: answered.map((q) => {
      const a = check.answers[q.key]
      const item: R = { linkId: q.key }
      if (a === 'unsure') return item // no answer recorded; the Observation carries dataAbsentReason
      if (q.kind === 'temperature') item.answer = [{ valueQuantity: { value: a, unit: '°C', system: 'http://unitsofmeasure.org', code: 'Cel' } }]
      else if (q.kind === 'multi') item.answer = (a as string[]).map((c) => ({ valueCoding: { system: LOCAL_CS, code: c } }))
      else item.answer = [{ valueCoding: { system: OAH_CS, code: a } }]
      return item
    }),
  }
  entries.push({ fullUrl: `urn:uuid:${qrId}`, resource: qr, request: { method: 'POST', url: 'QuestionnaireResponse' } })

  const obsIds: string[] = []
  for (const q of answered) {
    const id = uuid(`obs${check.id}${q.key}`)
    obsIds.push(id)
    const a = check.answers[q.key]
    const obs: R = {
      resourceType: 'Observation',
      text: narrative(`${q.key}: ${a === 'unsure' ? 'not sure' : Array.isArray(a) ? a.join(', ') : String(a)} (citizen check, preliminary)`),
      status: 'preliminary',
      category: [{ coding: [CATEGORY] }],
      code: { coding: [{ system: q.code.system, code: q.code.code }] },
      subject: { reference: `urn:uuid:${locId}` },
      effectiveDateTime: check.createdAt,
      // no account, no identity: the observer is recorded only as an anonymous citizen
      performer: [{ display: 'Anonymous citizen observer (StreamRecord, no account)' }],
      derivedFrom: [{ reference: `urn:uuid:${qrId}` }],
      ...valueFor(q.key, a),
    }
    entries.push({ fullUrl: `urn:uuid:${id}`, resource: obs, request: { method: 'POST', url: 'Observation' } })
  }

  const device: R = {
    resourceType: 'Device',
    text: narrative('StreamRecord citizen check app'),
    deviceName: [{ name: 'StreamRecord', type: 'user-friendly-name' }],
    version: [{ value: '0.1.0' }],
  }
  entries.push({ fullUrl: `urn:uuid:${devId}`, resource: device,
    request: { method: 'POST', url: 'Device', ifNoneExist: 'device-name=StreamRecord' } })

  const prov: R = {
    resourceType: 'Provenance',
    text: narrative('Recorded by an anonymous resident using StreamRecord. Preliminary until reviewed.'),
    target: [{ reference: `urn:uuid:${qrId}` }, ...obsIds.map((i) => ({ reference: `urn:uuid:${i}` }))],
    recorded: check.createdAt,
    agent: [{
      type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type', code: 'author', display: 'Author' }] },
      who: { reference: `urn:uuid:${devId}`, display: 'StreamRecord app on behalf of an anonymous resident' },
    }],
  }
  entries.push({ fullUrl: `urn:uuid:${uuid('prov' + check.id)}`, resource: prov, request: { method: 'POST', url: 'Provenance' } })

  return { resourceType: 'Bundle', type: 'transaction', entry: entries }
}
