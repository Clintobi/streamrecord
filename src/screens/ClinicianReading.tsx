import { useEffect, useState } from 'react'
import { findSite } from '../data'
import { useI18n } from '../i18n'
import { CityIndex, daysSince, findingsFromChecks, labStatus, longDate, Site } from '../model'
import { checksFor } from '../store'
import { Skeleton, StatusLine } from '../ui'

export default function ClinicianReading({ id }: { id: string }) {
  const { t, d, lang } = useI18n()
  const [data, setData] = useState<{ site: Site; city: CityIndex } | null | undefined>(undefined)
  useEffect(() => { findSite(id).then(setData) }, [id])
  if (data === undefined) return <Skeleton />
  if (data === null) return <div className="wrap"><h1>Site not found</h1></div>
  const { site, city } = data
  const findings = findingsFromChecks(checksFor(site.id))
  const F = d.findings as Record<string, any>
  const today = new Date().toISOString().slice(0, 10)
  const r = site.risk
  const age = daysSince(r?.date)
  const fx = (v?: number | null) => (typeof v === 'number' ? v.toFixed(2) : 'n/a')
  return (
    <article className="wrap clinician">
      <nav className="crumbs noprint" aria-label="Breadcrumb"><a href={`#/site/${encodeURIComponent(site.id)}`}>← {site.name}</a></nav>
      <h1>{t('clinTitle')}: {site.name}</h1>
      <p className="meta">{t('clinFor', { id: site.id, city: city.name })} {t('dated', { date: today })}</p>
      <p className="noprint"><button className="btn secondary" onClick={() => window.print()}>{t('print')}</button></p>
      <section className="labbox" aria-labelledby="lab">
        <h2 id="lab">{t('labTitle')}</h2>
        {r && r.level !== 'unknown' && typeof r.score === 'number' ? (
          <>
            <StatusLine status={labStatus(site)}>{t(`head_${r.level}` as any)}</StatusLine>
            <dl style={{ marginTop: 10 }}>
              <dt>{t('clinScore')}</dt><dd className="num">{r.score.toFixed(2)} {t('scoreOf')}</dd>
              <dt>{t('clinParts')}</dt><dd>{t('partPathogen')} <span className="num">{fx(r.parts?.scaledPathogenRisk)}</span> · {t('partFecal')} <span className="num">{fx(r.parts?.scaledFecalRisk)}</span> · {t('partArg')} <span className="num">{fx(r.parts?.scaledArgRisk)}</span></dd>
              <dt>{t('clinSampled')}</dt><dd>{longDate(r.date, lang)}{age !== null ? ` (${t('daysAgo', { days: age.toLocaleString(lang === 'no' ? 'nb' : lang) })})` : ''}</dd>
              <dt>{t('clinBand')}</dt><dd>{t(`level_${r.level}` as any)} ({t('ourThirds')})</dd>
            </dl>
          </>
        ) : <p style={{ margin: 0 }}>{t('statusNoLab')}</p>}
        <p className="src">{t('source')}: ENORA OneAquaHealth API (api.enora-oah.eu), snapshot 2026-10-04.</p>
      </section>
      {findings.length === 0 ? <p>{t('clinNone')}</p> : findings.map((f) => (
        <section key={f} className="finding-c">
          <h2>{F[f].label}</h2>
          <h3>{t('clinMay')}</h3><p>{F[f].clin.may}</p>
          <h3>{t('clinNot')}</h3><p>{F[f].clin.not}</p>
          <h3>{t('clinAdvice')}</h3><p>{F[f].clin.advice}</p>
          <h3>{t('clinContact')}</h3><p>{F[f].clin.contact}</p>
        </section>
      ))}
      <div className="notbox">
        <h2 style={{ marginTop: 0 }}>{t('notTitle')}</h2>
        <p>{t('notBody')}</p>
        <p><strong>{t('disclaimer')}</strong></p>
        <p className="src">Sources: resident check recorded with StreamRecord (preliminary); site and lab data from the ENORA OneAquaHealth API; measures from the OneAquaHealth Catalogue of Measures. {t('dated', { date: today })}.</p>
      </div>
    </article>
  )
}
