// Writes the Questionnaire and local CodeSystem that StreamRecord's bundles point to, so their canonicals resolve.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { LOCAL_CS, QUESTIONS } from '../src/model'

const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8'))
const Q = en.questions as Record<string, any>
const narrative = (s: string) => ({ status: 'generated', div: `<div xmlns="http://www.w3.org/1999/xhtml">${s}</div>` })

const questionnaire = {
  resourceType: 'Questionnaire', id: 'streamrecord-check',
  url: 'https://streamrecord.vercel.app/fhir/Questionnaire/streamrecord-check', version: '0.1.0',
  name: 'StreamRecordCheck', title: 'StreamRecord five-minute stream check', status: 'draft', experimental: true,
  date: '2026-10-04', publisher: 'StreamRecord (hackathon prototype, not affiliated with OneAquaHealth)',
  text: narrative('Seven questions a resident can answer from the bank of a stream. Every coded question also accepts Not sure.'),
  item: QUESTIONS.map((q) => ({
    linkId: q.key, text: Q[q.key].q, required: !q.optional,
    code: [{ system: q.code.system, code: q.code.code }],
    type: q.kind === 'temperature' ? 'decimal' : 'choice',
    ...(q.kind === 'multi' ? { repeats: true } : {}),
    ...(q.kind === 'temperature' ? {} : {
      answerOption: [...q.options.map((o) => ({ valueCoding: { system: q.answerSystem!, code: o, display: Q[q.key].a[o] } })),
        { valueCoding: { system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason', code: 'asked-unknown', display: 'Not sure' } }],
    }),
  })),
}

const codeSystem = {
  resourceType: 'CodeSystem', id: 'streamrecord-local', url: LOCAL_CS, version: '0.1.0',
  name: 'StreamRecordLocal', title: 'StreamRecord local codes', status: 'draft', experimental: true, caseSensitive: true,
  content: 'complete', date: '2026-10-04',
  text: narrative('Codes StreamRecord needs that the OneAquaHealth temporary CodeSystem (IG commit b907cf0) does not have.'),
  concept: [
    { code: 'citizen-science', display: 'Citizen science', definition: 'Observation category: reported by a member of the public with no training, unverified.' },
    { code: 'colourSmell', display: 'Unusual colour or smell', definition: 'Refines OAH "foam" (Foam/colour/smell) so foam and colour/smell can be answered separately.' },
    { code: 'otherSigns', display: 'Other visible signs', definition: 'Question code for the multi-select of scum, dead fish and standing water.' },
    { code: 'scum', display: 'Green or blue-green scum', definition: 'A coloured film or scum on the surface. Not a confirmed cyanobacterial bloom.' },
    { code: 'deadFish', display: 'Dead fish', definition: 'One or more dead fish seen in or by the water.' },
    { code: 'standingWater', display: 'Standing water nearby', definition: 'Still water pools near the stream (possible mosquito breeding).' },
    { code: 'none', display: 'None of these', definition: 'None of the other signs, or none of the feelings, apply.' },
    { code: 'overallAssessment', display: 'Overall assessment of the stream', definition: "Question code for the resident's overall view, answered with the OneAquaHealth Citizen Science App's own codes (GOOD, MODERATE, POOR) from the ENORA API." },
    { code: 'feelings', display: 'How the resident feels at the stream', definition: 'Question code for the feelings the OneAquaHealth app asks about, to relate ecosystem quality to wellbeing.' },
    { code: 'joy', display: 'Joy', definition: 'The resident feels joy at the stream.' },
    { code: 'serenity', display: 'Calm', definition: 'The resident feels calm (serenity) at the stream.' },
    { code: 'anger', display: 'Anger', definition: 'The resident feels angry at the state of the stream.' },
    { code: 'fear', display: 'Fear or unease', definition: 'The resident feels afraid or uneasy at the stream.' },
  ],
}

mkdirSync('public/fhir', { recursive: true })
writeFileSync('public/fhir/Questionnaire-streamrecord-check.json', JSON.stringify(questionnaire, null, 2))
writeFileSync('public/fhir/CodeSystem-streamrecord-local.json', JSON.stringify(codeSystem, null, 2))
console.log('wrote', questionnaire.item.length, 'items,', codeSystem.concept.length, 'codes')
