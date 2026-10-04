// Stream Facts (a nutrition-label format for a stream's lab record), the stream's history
// (every event on file, newest first) and the QR code that links a printed sign to the reading.
import { useI18n } from './i18n'
import { Check, daysSince, findingsFromAnswers, findingsFromChecks, longDate, Site } from './model'

const r2 = (v?: number | null) => (typeof v === 'number' ? v.toFixed(2) : 'n/a')
export const SITE_URL = 'https://streamrecord.vercel.app/'

export function StreamFacts({ site, sites, checks, cityName }: { site: Site; sites: Site[]; checks: Check[]; cityName: string }) {
  const { t, d, lang } = useI18n()
  const F = d.findings as Record<string, any>
  const r = site.risk
  const scored = sites.filter((s) => typeof s.risk?.score === 'number').sort((a, b) => (b.risk!.score as number) - (a.risk!.score as number))
  const rank = scored.findIndex((s) => s.id === site.id) + 1
  const age = daysSince(r?.date)
  const live = checks.filter((c) => c.status !== 'entered-in-error')
  const signs = findingsFromChecks(checks)
  const nf = (n: number, digits = 0) => n.toLocaleString(lang === 'no' ? 'nb' : lang, { maximumFractionDigits: digits, minimumFractionDigits: digits })
  const has = r && r.level !== 'unknown' && typeof r.score === 'number'
  return (
    <section className="facts" aria-labelledby={`facts-${site.id}`}>
      <h2 id={`facts-${site.id}`} className="facts-title">{t('factsTitle')}</h2>
      <p className="facts-site">{site.name} · {cityName} · {site.id}</p>
      <div className="facts-rule thick" />
      {has ? (
        <>
          <div className="facts-row big"><span>{t('factsScore')}</span><span className="num">{r2(r!.score)} <small>{t('scoreOf')}</small></span></div>
          <div className="facts-rule" />
          <div className="facts-row ind"><span>{t('partPathogen')}</span><span className="num">{r2(r!.parts?.scaledPathogenRisk)}</span></div>
          <div className="facts-row ind"><span>{t('partFecal')}</span><span className="num">{r2(r!.parts?.scaledFecalRisk)}</span></div>
          <div className="facts-row ind"><span>{t('partArg')}</span><span className="num">{r2(r!.parts?.scaledArgRisk)}</span></div>
          <div className="facts-rule mid" />
          <div className="facts-row"><span>{t('factsRank', { city: cityName })}</span><span className="num">{rank} / {scored.length}</span></div>
          <div className="facts-row"><span>{t('factsBand')}*</span><span>{t(`level_${r!.level}` as any)}</span></div>
          <div className="facts-rule thick" />
          <div className="facts-row"><span>{t('factsTested')}</span><span>{longDate(r!.date, lang)}</span></div>
          {age !== null && <div className="facts-row stamp"><span>{t('factsAge')}</span><span className="expiry">{t('factsAgeVal', { y: nf(age / 365.25, 1) })}</span></div>}
          <div className="facts-row"><span>{t('factsNewer')}</span><span>{t('factsNone')}</span></div>
        </>
      ) : <div className="facts-row"><span>{t('hist_nolab')}</span><span /></div>}
      <div className="facts-rule mid" />
      <div className="facts-row"><span>{t('factsChecks')}</span><span>{t('factsChecksVal', { n: live.length, c: live.filter((c) => c.status === 'final').length })}</span></div>
      <div className="facts-row wrap"><span>{t('factsSigns')}</span><span>{signs.length ? signs.map((f) => F[f]?.label).join(', ') : t('factsNone')}</span></div>
      <div className="facts-rule thick" />
      <p className="facts-foot">{t('factsFoot')}</p>
    </section>
  )
}

// Newest first: review decisions, resident checks, the lab sample, and the day the record was retrieved.
export function History({ site, checks }: { site: Site; checks: Check[] }) {
  const { t, d, lang } = useI18n()
  const F = d.findings as Record<string, any>
  type Ev = { at: string; kind: 'retrieved' | 'lab' | 'nolab' | 'check' | 'confirmed' | 'rejected'; text: string; sample?: boolean }
  const ev: Ev[] = [{ at: '2026-10-04', kind: 'retrieved', text: t('hist_retrieved') }]
  const r = site.risk
  if (r && typeof r.score === 'number') ev.push({ at: r.date || '', kind: 'lab', text: t('hist_lab', { score: r2(r.score), p: r2(r.parts?.scaledPathogenRisk), f: r2(r.parts?.scaledFecalRisk), a: r2(r.parts?.scaledArgRisk) }) })
  else ev.push({ at: '', kind: 'nolab', text: t('hist_nolab') })
  for (const c of checks) {
    const signs = findingsFromAnswers(c.answers).map((f) => F[f]?.label)
    ev.push({ at: c.createdAt, kind: 'check', sample: c.sample, text: signs.length ? t('hist_check', { signs: signs.join(', ') }) : t('hist_checkNone') })
    if (c.review) ev.push({ at: c.review.at, kind: c.review.decision === 'final' ? 'confirmed' : 'rejected', text: t(c.review.decision === 'final' ? 'hist_confirmed' : 'hist_rejected', { who: c.review.reviewer, reason: c.review.reason }) })
  }
  ev.sort((a, b) => (b.at || '').localeCompare(a.at || ''))
  return (
    <ol className="history">
      {ev.map((e, i) => (
        <li key={i} className={`ev ev-${e.kind}`}>
          <time dateTime={e.at || undefined}>{e.at ? longDate(e.at, lang) : '–'}</time>
          <span>{e.text}{e.sample && <span className="tag">{t('sampleTag')}</span>}</span>
        </li>
      ))}
    </ol>
  )
}
