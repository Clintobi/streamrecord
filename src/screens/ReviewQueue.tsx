import { useEffect, useRef, useState } from 'react'
import { loadCities, loadCity } from '../data'
import { buildBundle } from '../fhir'
import { useI18n } from '../i18n'
import { Check, findingsFromAnswers, longDate, secondLook, Site } from '../model'
import { allChecks, saveCheck, updateCheck } from '../store'
import { Shape, Skeleton } from '../ui'

// A clearly labelled synthetic check, so a judge or reviewer can try the flow on an empty phone.
function sampleCheck(): Check {
  return {
    id: `sample-${Date.now()}`, siteId: 'C1', createdAt: new Date().toISOString(), status: 'preliminary', sample: true,
    answers: { foam: 'absent', colourSmell: 'present', riparianVegetation: '21-40-percent', macrophytes: 'unsure', invasiveOrganisms: 'absent', other: ['scum', 'deadFish'], waterTemperature: 8 },
  }
}

function Item({ c, site, onChange }: { c: Check; site?: Site; onChange: () => void }) {
  const { t, d, lang } = useI18n()
  const F = d.findings as Record<string, any>
  const [reason, setReason] = useState('')
  const [who, setWho] = useState('')
  const [error, setError] = useState(false)
  const [fhir, setFhir] = useState(false)
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const flags = secondLook(c.answers)
  const findings = findingsFromAnswers(c.answers)
  const st = c.status === 'final' ? 'ok' : c.status === 'entered-in-error' ? 'none' : flags.length ? 'look' : 'none'
  const stWord = c.status === 'final' ? t('st_final') : c.status === 'entered-in-error' ? t('st_rejected') : t('st_preliminary')

  const decide = (decision: 'final' | 'entered-in-error') => {
    if (!reason.trim()) { setError(true); reasonRef.current?.focus(); return }
    updateCheck({ ...c, status: decision, review: { decision, reason: reason.trim(), reviewer: who.trim() || t('reviewerDefault'), at: new Date().toISOString() } })
    onChange()
  }
  const reopen = () => { const { review: _r, ...rest } = c; updateCheck({ ...rest, status: 'preliminary' }); onChange() }
  const fid = `r-${c.id}`

  return (
    <article className={`rq rq-${c.status}`} aria-labelledby={`${fid}-h`}>
      <div className="rq-head">
        <h3 id={`${fid}-h`}><a href={`#/site/${encodeURIComponent(c.siteId)}`}>{site?.name || c.siteId}</a></h3>
        <p className={`status ${st}`}><Shape status={st} />{stWord}</p>
      </div>
      <p className="meta">{site?.city ? `${site.city} · ` : ''}{longDate(c.createdAt, lang)}{c.sample && <span className="tag">{t('sampleTag')}</span>}</p>
      <p className="rq-found">{findings.length ? <><strong>{t('reported')}:</strong> {findings.map((f) => F[f]?.label).join(' · ')}</> : t('b3Nothing')}</p>
      {flags.length > 0 && c.status === 'preliminary' && (
        <ul className="rq-flags">{flags.map((f) => <li key={f}><Shape status="look" /><span>{t(`flag_${f}` as any)}</span></li>)}</ul>
      )}

      {c.review ? (
        <div className="rq-decision">
          <p><strong>{t('decided', { decision: c.review.decision === 'final' ? t('st_final') : t('st_rejected'), who: c.review.reviewer, date: longDate(c.review.at, lang) })}</strong></p>
          <p className="reading">“{c.review.reason}”</p>
          <button className="linkbtn" onClick={reopen}>{t('reopen')}</button>
        </div>
      ) : (
        <form className="rq-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <div className={`field${error ? ' has-error' : ''}`}>
            <label htmlFor={`${fid}-reason`}>{t('reason')}</label>
            <p className="hint" id={`${fid}-hint`}>{t('reasonHint')}</p>
            {error && <p className="field-error" id={`${fid}-err`}>{t('reasonError')}</p>}
            <textarea id={`${fid}-reason`} ref={reasonRef} rows={2} value={reason} aria-invalid={error || undefined}
              aria-describedby={`${fid}-hint${error ? ` ${fid}-err` : ''}`} onChange={(e) => { setReason(e.target.value); if (e.target.value.trim()) setError(false) }} />
          </div>
          <div className="field">
            <label htmlFor={`${fid}-who`}>{t('reviewer')}</label>
            <input id={`${fid}-who`} type="text" value={who} placeholder={t('reviewerDefault')} autoComplete="off" onChange={(e) => setWho(e.target.value)} />
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={() => decide('final')}>{t('confirm')}</button>
            <button type="button" className="btn secondary danger" onClick={() => decide('entered-in-error')}>{t('reject')}</button>
          </div>
        </form>
      )}

      {site && (
        <>
          <button className="linkbtn" aria-expanded={fhir} onClick={() => setFhir((v) => !v)}>{t('showFhir')}</button>
          {fhir && <pre aria-label="FHIR R4 transaction bundle">{JSON.stringify(buildBundle(site, c), null, 2)}</pre>}
        </>
      )}
    </article>
  )
}

export default function ReviewQueue() {
  const { t } = useI18n()
  const [sites, setSites] = useState<Map<string, Site> | null>(null)
  const [checks, setChecks] = useState<Check[]>(() => allChecks())
  const refresh = () => setChecks(allChecks())
  useEffect(() => {
    loadCities().then((cs) => Promise.all(cs.map((c) => loadCity(c.slug)))).then((all) => setSites(new Map(all.flat().map((s) => [s.id, s]))))
  }, [])
  if (!sites) return <Skeleton />

  const newest = (a: Check, b: Check) => b.createdAt.localeCompare(a.createdAt)
  const flagged = checks.filter((c) => c.status === 'preliminary' && secondLook(c.answers).length).sort(newest)
  const pending = checks.filter((c) => c.status === 'preliminary' && !secondLook(c.answers).length).sort(newest)
  const done = checks.filter((c) => c.status !== 'preliminary').sort(newest)
  const addSample = () => { saveCheck(sampleCheck()); refresh() }

  const group = (title: string, list: Check[], note?: string) => list.length > 0 && (
    <section className="rq-group" aria-label={title}>
      <h2>{title} <span className="count">{list.length}</span></h2>
      {note && <p className="meta">{note}</p>}
      {list.map((c) => <Item key={c.id} c={c} site={sites.get(c.siteId)} onChange={refresh} />)}
    </section>
  )

  return (
    <div className="wrap review">
      <h1>{t('reviewTitle')}</h1>
      <p className="reading">{t('reviewIntro')}</p>
      {checks.length === 0 ? (
        <div className="rq-empty">
          <p>{t('reviewEmpty')}</p>
          <div className="actions">
            <a className="btn secondary" href="#/">{t('navMap')}</a>
            <button className="btn" onClick={addSample}>{t('reviewSample')}</button>
          </div>
        </div>
      ) : (
        <>
          {group(t('grpFlagged'), flagged, t('rulesNote'))}
          {group(t('grpPending'), pending)}
          {group(t('grpDone'), done)}
          {!checks.some((c) => c.sample) && <p className="meta"><button className="linkbtn" onClick={addSample}>{t('reviewSample')}</button></p>}
        </>
      )}
    </div>
  )
}
