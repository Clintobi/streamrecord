import { useEffect, useState } from 'react'
import { findSite, Library, loadLibrary } from '../data'
import { useI18n } from '../i18n'
import { CityIndex, daysSince, findingsFromChecks, labStatus, Site } from '../model'
import { checksFor } from '../store'
import { Skeleton, StatusLine } from '../ui'

export function DotStrip({ site, sites, cityName }: { site: Site; sites: Site[]; cityName: string }) {
  const { t } = useI18n()
  const scored = sites.filter((s) => typeof s.risk?.score === 'number')
  const levels = ['low', 'moderate', 'high']
  const useScore = scored.length >= Math.max(3, sites.length * 0.5)
  const W = 640, H = 70, pad = 20
  const vals = useScore ? scored.map((s) => s.risk!.score as number) : []
  const min = useScore ? Math.min(...vals) : 0, max = useScore ? Math.max(...vals) : 2
  const x = (s: Site) => {
    if (useScore && typeof s.risk?.score === 'number') return pad + ((s.risk.score - min) / (max - min || 1)) * (W - 2 * pad)
    const i = levels.indexOf(s.risk?.level || '')
    return i < 0 ? -1 : pad + (i / 2) * (W - 2 * pad)
  }
  const pts = sites.filter((s) => x(s) >= 0)
  if (pts.length < 2) return null
  const csv = () => {
    const rows = [['site_id', 'site_name', 'city', 'risk_level', 'risk_score', 'measured', 'source'].join(',')]
    for (const s of sites) rows.push([s.id, `"${s.name.replace(/"/g, '""')}"`, s.city, s.risk?.level || '', s.risk?.score ?? '', s.risk?.date || '', 'api.enora-oah.eu'].join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    a.download = `streamrecord-${cityName.toLowerCase()}-health-risk.csv`
    a.click()
  }
  return (
    <figure className="strip">
      <figcaption><strong>{t('stripTitle', { city: cityName })}</strong></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${pts.length} sites placed by lab health-risk; this site is highlighted.`}>
        <line x1={pad} x2={W - pad} y1={34} y2={34} stroke="#D9D4C7" />
        {pts.filter((s) => s.id !== site.id).map((s) => <circle key={s.id} cx={x(s)} cy={34} r={5} fill="#0072B2" fillOpacity={0.45} />)}
        {x(site) >= 0 && <circle cx={x(site)} cy={34} r={9} fill="#0072B2" stroke="#1B2A2F" strokeWidth={2} />}
        <text x={pad} y={62}>{useScore ? `lower ${min}` : t('level_low')}</text>
        <text x={W - pad} y={62} textAnchor="end">{useScore ? `higher ${max}` : t('level_high')}</text>
      </svg>
      <p className="src">{t('stripNote')} <button className="btn secondary" style={{ minHeight: 36, padding: '4px 12px' }} onClick={csv}>{t('downloadCsv')}</button></p>
    </figure>
  )
}

export default function SiteReading({ id }: { id: string }) {
  const { t, d } = useI18n()
  const [data, setData] = useState<{ site: Site; city: CityIndex; sites: Site[] } | null | undefined>(undefined)
  const [lib, setLib] = useState<Library>({})
  useEffect(() => { findSite(id).then(setData); loadLibrary().then(setLib) }, [id])

  if (data === undefined) return <Skeleton />
  if (data === null) return <div className="wrap"><h1>Site not found</h1><p><a href="#/">Back to the map</a></p></div>
  const { site, city, sites } = data
  const checks = checksFor(site.id)
  const findings = findingsFromChecks(checks)
  const age = daysSince(site.risk?.date)
  const st = labStatus(site)
  const F = d.findings as Record<string, any>
  const measures = (lib.measures || []).filter((m) => m.addresses?.some((a) => findings.includes(a))).slice(0, 3)
  const generalMeasures = measures.length ? measures : (lib.measures || []).filter((m) => /pollution|riparian/i.test(`${m.category} ${m.name}`)).slice(0, 2)
  const cat = lib.sources?.catalogue
  const pb = lib.policyBrief

  return (
    <article className="wrap">
      <p className="eyebrow">{t('siteEyebrow', { city: city.name, id: site.id })}</p>
      <h1>{site.name}</h1>
      {site.risk && site.risk.level !== 'unknown'
        ? <StatusLine status={st}>{t('statusLab', { level: t(`level_${site.risk.level}` as any), date: site.risk.date || '' })}</StatusLine>
        : <StatusLine status="none">{t('statusNoLab')}</StatusLine>}
      {age !== null && <p className="meta">{t('labAge', { days: age })}</p>}
      <div className="actions">
        <a className="btn" href={`#/check/${encodeURIComponent(site.id)}`}>{t('doCheck')}</a>
        <a className="btn secondary" href={`#/clinician/${encodeURIComponent(site.id)}`}>{t('clinicianLink')}</a>
      </div>

      <section className="block" aria-labelledby="b1">
        <h2 id="b1">{t('b1')}</h2>
        {site.risk && site.risk.level !== 'unknown' ? (
          <>
            <p className="reading"><span className="lab">{t('statusLab', { level: t(`level_${site.risk.level}` as any), date: site.risk.date || '' })}</span>{site.risk.label ? ` (${site.risk.label})` : ''}.</p>
            <DotStrip site={site} sites={sites} cityName={city.name} />
          </>
        ) : <p className="reading">{t('b1None')}</p>}
        <p className="src">{t('source')}: <a href="#/sources">ENORA OneAquaHealth API, health-risk map snapshot</a></p>
      </section>

      <section className="block" aria-labelledby="b2">
        <h2 id="b2">{t('b2')}</h2>
        {checks.length === 0 ? <p className="reading">{t('b2Empty')}</p> : (
          <>
            <p className="meta">{t('b2Saved')}: {checks.length}</p>
            <ul className="reading">
              {findings.length === 0 && <li>{t('b3Nothing')}</li>}
              {findings.map((f) => <li key={f}>{F[f]?.label} <span className="tag">preliminary</span></li>)}
            </ul>
          </>
        )}
        <p className="src">{t('source')}: citizen checks with StreamRecord, stored on this phone</p>
      </section>

      <section className="block" aria-labelledby="b3">
        <h2 id="b3">{t('b3')}</h2>
        {findings.length === 0 ? <p className="reading">{t('b3Nothing')}</p> : (
          <>
            <p className="meta">{t('b3Intro')}</p>
            {findings.map((f) => (
              <div key={f}>
                <h3>{F[f]?.label}</h3>
                <div className="three">
                  <section><h3>{t('people')}</h3><p className="reading">{F[f]?.people}</p></section>
                  <section><h3>{t('animals')}</h3><p className="reading">{F[f]?.animals}</p></section>
                  <section><h3>{t('stream')}</h3><p className="reading">{F[f]?.stream}</p></section>
                </div>
              </div>
            ))}
          </>
        )}
        <p className="src">{t('source')}: <a href={`#/clinician/${encodeURIComponent(site.id)}`}>{t('disclaimer')}</a></p>
      </section>

      <section className="block" aria-labelledby="b4">
        <h2 id="b4">{t('b4')}</h2>
        <p className="meta">{t('b4Intro')}</p>
        {generalMeasures.length === 0 ? <p className="meta">Catalogue of Measures not loaded.</p> : (
          <ul className="reading">
            {generalMeasures.map((m) => (
              <li key={m.id}><strong>{m.name}.</strong> {m.oneLine} <span className="src">({t('fromOAH')}, Catalogue of Measures, {t('page')} {m.page}{cat ? <>, <a href={cat.url}>source</a></> : null})</span></li>
            ))}
          </ul>
        )}
      </section>

      {pb && pb.quotes?.length ? (
        <section className="block" aria-labelledby="why">
          <h2 id="why">{t('whyCity')}</h2>
          {pb.quotes.slice(0, 2).map((q, i) => (
            <blockquote key={i} className="reading" style={{ margin: '0 0 16px', paddingLeft: 16, borderLeft: '3px solid #0F5C63' }}>
              "{q.text}"
              <p className="src">{t('fromOAH')}, Policy Brief{pb.date ? ` (${pb.date})` : ''}, {t('page')} {q.page}{pb.url ? <>, <a href={pb.url}>source</a></> : null}</p>
            </blockquote>
          ))}
        </section>
      ) : null}
    </article>
  )
}
