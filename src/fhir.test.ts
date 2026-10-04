import { describe, expect, it } from 'vitest'
import { buildBundle, LOCATION_OAH } from './fhir'
import { Check, findingsFromAnswers, Site, daysSince, labStatus } from './model'

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
  it('Observations do not claim observation-indicators-oah, which fixes status = final', () => {
    for (const e of bundle().entry.filter((x: any) => x.resource.resourceType === 'Observation')) {
      expect(e.resource.meta).toBeUndefined()
      expect(e.resource.status).toBe('preliminary')
      expect(e.resource.performer?.length).toBeGreaterThan(0)
    }
  })
})
