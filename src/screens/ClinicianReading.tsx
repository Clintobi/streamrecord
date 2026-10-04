import { useEffect, useState } from 'react'
import { findSite } from '../data'
import { useI18n } from '../i18n'
import { CityIndex, findingsFromChecks, Site } from '../model'
import { checksFor } from '../store'
import { Skeleton } from '../ui'

export default function ClinicianReading({ id }: { id: string }) {
  const { t, d } = useI18n()
  const [data, setData] = useState<{ site: Site; city: CityIndex } | null | undefined>(undefined)
  useEffect(() => { findSite(id).then(setData) }, [id])
  if (data === undefined) return <Skeleton />
  if (data === null) return <div className="wrap"><h1>Site not found</h1></div>
  const { site, city } = data
  const findings = findingsFromChecks(checksFor(site.id))
  const F = d.findings as Record<string, any>
  const today = new Date().toISOString().slice(0, 10)
  return (
    <article className="wrap clinician">
      <p className="noprint"><a href={`#/site/${encodeURIComponent(site.id)}`}>{site.name}</a></p>
      <h1>{t('clinTitle')}: {site.name}</h1>
      <p className="meta">{t('clinFor', { id: site.id, city: city.name })} {t('dated', { date: today })}</p>
      <p className="noprint"><button className="btn secondary" onClick={() => window.print()}>{t('print')}</button></p>
      {findings.length === 0 ? <p>{t('clinNone')}</p> : findings.map((f) => (
        <section key={f} className="block">
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
