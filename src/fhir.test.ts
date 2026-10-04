import { describe, expect, it } from 'vitest'
import { buildBundle, LOCATION_OAH, OBSERVATION_OAH } from './fhir'
import { lowerNearby, Check, confirmedFindings, findingsFromAnswers, findingsFromChecks, secondLook, Site, daysSince, labStatus } from './model'

const site: Site = { id: 'PT01', name: 'Test stream', city: 'Coimbra', country: 'PT', lat: 40.2, lon: -8.4, risk: { level: 'moderate', score: 0.5, date: '2025-06-12' } }
const check: Check = {
  id: 'PT01-1', siteId: 'PT01', createdAt: '2026-10-04T12:00:00Z', status: 'preliminary',
  answers: { foam: 'present', colourSmell: 'unsure', riparianVegetation: '21-40-percent', macrophytes: '41-60-percent', invasiveOrganisms: 'absent', other: ['scum', 'standingWater'], waterTemperature: 18.5 },
}

describe('FHIR bundle', () => {
  const b = buildBundle(site, check)
  const res = (t: string) => b.entry.filter((e: any) => e.resource.resourceType === t).map((e: any) => e.resource)
  it('is a transaction with the expected resource mix', () => {
    expect(b.resourceType).toBe('Bundle'); expect(b.type).toBe('transaction')
    expect(res('Location')).toHaveLength(1); expect(res('QuestionnaireResponse')).toHaveLength(1)
    expect(res('Observation')).toHaveLength(7); expect(res('Provenance')).toHaveLength(1); expect(res('Device')).toHaveLength(1)
  })
  it('gives every resource a narrative', () => { for (const e of b.entry) expect(e.resource.text?.div).toMatch(/^<div xmlns="http:\/\/www.w3.org\/1999\/xhtml">/) })
  it('every entry has a request and a urn:uuid fullUrl', () => { for (const e of b.entry) { expect(e.fullUrl).toMatch(/^urn:uuid:[0-9a-f-]{36}$/); expect(e.request.method).toBe('POST') } })
  it('resolves every internal reference', () => {
    const urls = new Set(b.entry.map((e: any) => e.fullUrl)); const refs: string[] = []
    JSON.stringify(b, (k, v) => { if (k === 'reference') refs.push(v); return v })
    for (const r of refs) expect(urls.has(r)).toBe(true)
  })
  it('maps Not sure to dataAbsentReason asked-unknown with no value', () => {
    const o = res('Observation').find((x: any) => x.code.coding[0].code === 'colourSmell')
    expect(o.dataAbsentReason.coding[0]).toMatchObject({ system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason', code: 'asked-unknown' })
    expect(o.valueCodeableConcept).toBeUndefined()
  })
  it('uses OAH codes for foam and percent bands, UCUM for temperature', () => {
    const foam = res('Observation').find((x: any) => x.code.coding[0].code === 'foam')
    expect(foam.code.coding[0].system).toBe('http://hl7.eu/fhir/ig/oah/CodeSystem/temporarySystem-oah-eu')
    expect(foam.valueCodeableConcept.coding[0].code).toBe('present')
    const rip = res('Observation').find((x: any) => x.code.coding[0].code === 'riparianVegetation')
    expect(rip.valueCodeableConcept.coding[0].code).toBe('21-40-percent')
    const temp = res('Observation').find((x: any) => x.code.coding[0].code === 'waterTemperature')
    expect(temp.valueQuantity).toMatchObject({ value: 18.5, system: 'http://unitsofmeasure.org', code: 'Cel' })
  })
  it('marks citizen observations preliminary', () => { for (const o of res('Observation')) expect(o.status).toBe('preliminary') })
  it('conditionally creates the Location by site identifier', () => {
    const e = b.entry.find((x: any) => x.resource.resourceType === 'Location')
    expect(e.request.ifNoneExist).toContain('PT01')
  })
  it('is deterministic for the same check', () => { expect(JSON.stringify(buildBundle(site, check))).toBe(JSON.stringify(b)) })
})

describe('findings', () => {
  it('raises findings only from clear reports', () => {
    expect(findingsFromAnswers(check.answers)).toEqual(['scum', 'foam', 'standingWater', 'riparianVegetation'])
    expect(findingsFromAnswers({ foam: 'unsure', other: ['none'] })).toEqual([])
  })
  it('maps lab levels to status', () => { expect(labStatus(site)).toBe('look'); expect(labStatus({ ...site, risk: undefined })).toBe('none') })
  it('counts days since a lab check', () => { expect(daysSince('2025-06-12', new Date('2026-10-04'))).toBe(479); expect(daysSince(null)).toBeNull() })
})

const bundle = () => buildBundle(site, check)

describe('location-oah rules (IG commit b907cf0)', () => {
  it('Location declares the profile and meets identifier 1.., name 1.., mode = instance, position lat/long', () => {
    const loc = bundle().entry[0].resource
    expect(loc.meta.profile).toEqual([LOCATION_OAH])
    expect(loc.identifier.length).toBeGreaterThan(0)
    expect(loc.name).toBeTruthy()
    expect(loc.mode).toBe('instance')
    expect(typeof loc.position.latitude).toBe('number')
    expect(typeof loc.position.longitude).toBe('number')
  })
  it('a confirmed check claims observation-indicators-oah and meets its rules (status final, code, subject location-oah, effective, performer, value type)', () => {
    const b = buildBundle(site, { ...check, status: 'final', review: { decision: 'final', reason: 'ok', reviewer: 'R', at: '2026-10-04T15:00:00Z' } })
    const loc = b.entry[0]
    for (const e of b.entry.filter((x: any) => x.resource.resourceType === 'Observation')) {
      const o = e.resource
      expect(o.meta.profile).toEqual([OBSERVATION_OAH])
      expect(o.status).toBe('final')
      expect(o.code.coding.length).toBeGreaterThan(0)
      expect(o.subject.reference).toBe(loc.fullUrl)
      expect(loc.resource.meta.profile).toEqual([LOCATION_OAH])
      expect(o.effectiveDateTime).toBeTruthy()
      expect(o.performer.length).toBeGreaterThan(0)
      expect(Object.keys(o).filter((k) => k.startsWith('value')).every((k) => k === 'valueCodeableConcept' || k === 'valueQuantity')).toBe(true)
    }
  })
  it('unreviewed and rejected Observations do not claim observation-indicators-oah, which fixes status = final', () => {
    for (const e of buildBundle(site, { ...check, status: 'entered-in-error' }).entry.filter((x: any) => x.resource.resourceType === 'Observation')) expect(e.resource.meta).toBeUndefined()
    for (const e of bundle().entry.filter((x: any) => x.resource.resourceType === 'Observation')) {
      expect(e.resource.meta).toBeUndefined()
      expect(e.resource.status).toBe('preliminary')
      expect(e.resource.performer?.length).toBeGreaterThan(0)
    }
  })
})

describe('data gaps', () => {
  it('gives an unnamed ENORA site a Location name, as location-oah requires', () => {
    const loc = buildBundle({ ...site, id: 'T21', name: '' }, { ...check, siteId: 'T21' }).entry[0].resource
    expect(loc.name).toBe('Site T21')
  })
})

describe('review queue', () => {
  it('flags reports a person should confirm (our rules)', () => {
    expect(secondLook({ other: ['deadFish'] })).toEqual(['deadFish'])
    expect(secondLook({ other: ['scum'], waterTemperature: 8 })).toEqual(['coldScum'])
    expect(secondLook({ other: ['scum'], waterTemperature: 18 })).toEqual([])
    expect(secondLook({ waterTemperature: 31 })).toEqual(['hotWater'])
    expect(secondLook({ foam: 'unsure', colourSmell: 'unsure', riparianVegetation: 'unsure', macrophytes: 'unsure' })).toEqual(['mostlyUnsure'])
    expect(secondLook(check.answers)).toEqual([])
  })
  it('stops counting a rejected check and marks confirmed findings', () => {
    const rejected: Check = { ...check, id: 'x1', status: 'entered-in-error' }
    const confirmed: Check = { ...check, id: 'x2', status: 'final', answers: { foam: 'present' } }
    expect(findingsFromChecks([rejected])).toEqual([])
    expect(findingsFromChecks([rejected, confirmed])).toEqual(['foam'])
    expect([...confirmedFindings([rejected, confirmed])]).toEqual(['foam'])
  })
  it('a reviewed check carries its status to every Observation and adds a verifier Provenance with the reason', () => {
    const at = '2026-10-04T15:00:00Z'
    for (const decision of ['final', 'entered-in-error'] as const) {
      const b = buildBundle(site, { ...check, status: decision, review: { decision, reason: 'Photo checked', reviewer: 'Coimbra reviewer', at } })
      const obs = b.entry.filter((e: any) => e.resource.resourceType === 'Observation')
      for (const o of obs) expect(o.resource.status).toBe(decision)
      const qr = b.entry.find((e: any) => e.resource.resourceType === 'QuestionnaireResponse').resource
      expect(qr.status).toBe(decision === 'final' ? 'completed' : 'entered-in-error')
      const provs = b.entry.filter((e: any) => e.resource.resourceType === 'Provenance').map((e: any) => e.resource)
      expect(provs).toHaveLength(2)
      expect(provs[1].agent[0].type.coding[0].code).toBe('verifier')
      expect(provs[1].reason[0].text).toBe('Photo checked')
      expect(provs[1].target).toHaveLength(obs.length + 1)
      const urls = new Set(b.entry.map((e: any) => e.fullUrl)); const refs: string[] = []
      JSON.stringify(b, (k, v) => { if (k === 'reference') refs.push(v); return v })
      for (const r of refs) expect(urls.has(r)).toBe(true)
    }
  })
})

describe('lower-scoring sites nearby', () => {
  const at = (id: string, lat: number, level: any) => ({ ...site, id, lat, lon: -8.4, risk: { level, score: 0.1 } }) as Site
  it('lists only same-list low sites, nearest first, and only for a high site', () => {
    const hi = at('H', 40.2, 'high'), near = at('N', 40.21, 'low'), far = at('F', 40.4, 'low'), mod = at('M', 40.201, 'moderate')
    expect(lowerNearby(hi, [hi, far, mod, near]).map((x) => x.site.id)).toEqual(['N', 'F'])
    expect(lowerNearby(near, [hi, far, near])).toEqual([])
  })
})
