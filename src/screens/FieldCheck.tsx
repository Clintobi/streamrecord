import { useEffect, useRef, useState } from 'react'
import { findSite, Library, loadLibrary } from '../data'
import { buildBundle } from '../fhir'
import { useI18n } from '../i18n'
import { Answers, Check, QUESTIONS, secondLook, Site } from '../model'
import { saveCheck } from '../store'
import { Skeleton } from '../ui'

// simple line pictograms, decorative (answers are always labelled in words)
function Pic({ k }: { k: string }) {
  const c = { fill: 'none', stroke: '#1B2A2F', strokeWidth: 2, strokeLinecap: 'round' as const }
  const water = <path d="M4 28c5-4 9 4 14 0s9 4 14 0" {...c} />
  const map: Record<string, JSX.Element> = {
    present: <>{water}<circle cx="12" cy="20" r="3" {...c} /><circle cx="20" cy="18" r="4" {...c} /><circle cx="27" cy="21" r="2.5" {...c} /></>,
    absent: <>{water}<path d="M10 16l12 0" {...c} /></>,
    scum: <>{water}<path d="M6 21h24" stroke="#009E73" strokeWidth="4" strokeLinecap="round" /></>,
    deadFish: <><path d="M6 18c6-6 14-6 20 0-6 6-14 6-20 0z" {...c} /><path d="M26 18l5-4v8z" {...c} /><path d="M11 16l2 2m0-2l-2 2" {...c} /></>,
    standingWater: <><ellipse cx="18" cy="24" rx="13" ry="5" {...c} /><path d="M18 8v8m-3-3 3 3 3-3" {...c} /></>,
    none: <path d="M8 18h20" {...c} />,
  }
  const band = /^(\d+)-(\d+)-percent$/.exec(k)
  const inner = band ? <><rect x="4" y="14" width="28" height="10" {...c} /><rect x="4" y="14" width={(Number(band[2]) / 100) * 28} height="10" fill="#009E73" /></> : map[k] || null
  return <svg className="pic" viewBox="0 0 36 36" aria-hidden="true">{inner}</svg>
}

const PICS = ['present', 'absent', 'scum', 'deadFish', 'standingWater', 'none']
const hasPic = (k: string) => PICS.includes(k) || /^\d+-\d+-percent$/.test(k)

export default function FieldCheck({ id }: { id: string }) {
  const { t, d } = useI18n()
  const [site, setSite] = useState<Site | null | undefined>(undefined)
  const [lib, setLib] = useState<Library>({})
  const [step, setStep] = useState(-1) // -1 intro, QUESTIONS.length = done
  const [answers, setAnswers] = useState<Answers>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Check | null>(null)
  const [showFhir, setShowFhir] = useState(false)
  const errRef = useRef<HTMLDivElement>(null)
  useEffect(() => { findSite(id).then((r) => setSite(r ? r.site : null)); loadLibrary().then(setLib) }, [id])
  useEffect(() => { if (error) errRef.current?.focus() }, [error])

  if (site === undefined) return <Skeleton />
  if (site === null) return <div className="wrap"><h1>Site not found</h1></div>
  const Q = d.questions as Record<string, any>
  const total = QUESTIONS.length

  if (saved) {
    const bundle = buildBundle(site, saved)
    return (
      <div className="wrap">
        <div className="notice" role="status"><h1><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13" fill="var(--stream)" /><path d="M8 14.5l4 4 8-9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{t('savedTitle')}</h1><p>{t('savedBody')}</p>
          {!navigator.onLine && <p><strong>{t('offline')}</strong></p>}
          {secondLook(saved.answers).length > 0 && (<><p><strong>{t('savedFlagged')}</strong></p><ul>{secondLook(saved.answers).map((f) => <li key={f}>{t(`flag_${f}` as any)}</li>)}</ul></>)}</div>
        <div className="actions">
          <a className="btn" href={`#/site/${encodeURIComponent(site.id)}`}>{t('seeReading')}</a>
          <button className="btn secondary" aria-expanded={showFhir} onClick={() => setShowFhir((v) => !v)}>{t('showFhir')}</button>
        </div>
        {showFhir && <pre aria-label="FHIR R4 transaction bundle">{JSON.stringify(bundle, null, 2)}</pre>}
      </div>
    )
  }

  if (step === -1) {
    return (
      <div className="wrap">
        <nav className="crumbs noprint" aria-label="Breadcrumb"><a href={`#/site/${encodeURIComponent(site.id)}`}>← {site.name}</a></nav>
        <h1>{t('checkTitle')}</h1>
        <p className="reading">{t('checkIntro')}</p>
        <button className="btn" onClick={() => setStep(0)}>{t('start')}</button>
      </div>
    )
  }

  const q = QUESTIONS[step]
  const qt = Q[q.key]
  const val = answers[q.key]
  const ind = lib.indicators?.find((x) => x.key === q.key)
  const set = (v: any) => { setAnswers((a) => ({ ...a, [q.key]: v })); setError(null) }

  const next = () => {
    if (q.kind === 'temperature') {
      if (val !== undefined && val !== null && val !== 'unsure') {
        const n = Number(val)
        if (Number.isNaN(n) || n < 0 || n > 40) { setError(t('tempError')); return }
      }
    } else if (val === undefined || (Array.isArray(val) && val.length === 0)) { setError(t('errorChoose')); return }
    advance(answers)
  }
  const advance = (a: Answers) => {
    if (step + 1 < total) { setStep(step + 1); return }
    const c: Check = { id: `${site.id}-${Date.now()}`, siteId: site.id, createdAt: new Date().toISOString(), answers: a, status: 'preliminary' }
    saveCheck(c); setSaved(c)
  }

  return (
    <div className="wrap">
      <p className="progress"><span>{t('of', { n: step + 1, total })}</span><span>{site.name}</span></p>
      <div className="steps" aria-hidden="true" style={{ ['--n' as any]: total }}>{QUESTIONS.map((_, i) => <span key={i} className={i <= step ? 'on' : undefined} />)}</div>
      {error && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={errRef}>
          <h2>{t('errorTitle')}</h2>
          <a href={`#field-${q.key}`} onClick={(e) => { e.preventDefault(); document.getElementById(`field-${q.key}`)?.focus() }}>{error}</a>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); next() }}>
        <fieldset aria-describedby={`hint-${q.key}`}>
          <legend>{qt.q}</legend>
          <p className="hint" id={`hint-${q.key}`}>{qt.hint}</p>
          {q.kind === 'temperature' ? (
            <p className="tempfield"><label htmlFor={`field-${q.key}`} className="sr-only">°C</label>
              <input id={`field-${q.key}`} type="number" inputMode="decimal" step="0.1" min={0} max={40}
                value={typeof val === 'number' ? val : ''} onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))} /> °C</p>
          ) : (
            <div className="choices">
              {[...q.options, 'unsure'].map((o, i) => {
                const label = o === 'unsure' ? t('notSure') : qt.a[o]
                const multi = q.kind === 'multi' && o !== 'unsure'
                const checked = multi ? Array.isArray(val) && val.includes(o) : val === o
                const onChange = () => {
                  if (!multi) return set(o)
                  const cur = Array.isArray(val) ? val : []
                  if (o === 'none') return set(cur.includes('none') ? [] : ['none'])
                  const nextVal = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur.filter((x) => x !== 'none'), o]
                  set(nextVal)
                }
                return (
                  <label key={o} className={`choice${o === 'unsure' ? ' unsure' : ''}`}>
                    <input id={i === 0 ? `field-${q.key}` : undefined} type={multi ? 'checkbox' : 'radio'} name={q.key} checked={checked} onChange={onChange} />
                    {o !== 'unsure' && hasPic(o) && q.key !== 'feelings' && <Pic k={o} />}
                    {typeof label === 'string' && label.includes(': ')
                      ? <span><strong>{label.split(': ')[0]}</strong><span className="rest">: {label.split(': ').slice(1).join(': ')}</span></span>
                      : <span>{label}</span>}
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>
        {ind ? (
          <details style={{ marginTop: 24 }}>
            <summary>About this indicator</summary>
            <p className="reading">{ind.explanation}</p>
            <p className="src">Based on {ind.source.url ? <a href={ind.source.url}>{ind.source.record}</a> : ind.source.record}{ind.source.page ? `, p. ${ind.source.page}` : ''}</p>
          </details>
        ) : lib.unsourced?.includes(q.key) ? (
          <details style={{ marginTop: 24 }}>
            <summary>About this question</summary>
            <p className="reading">None of OneAquaHealth's published documents explain this sign, so StreamRecord quotes nothing for it. It is asked because residents notice it and it is easy to report.</p>
          </details>
        ) : null}
        <div className="actions">
          <button type="submit" className="btn">{t('next')}</button>
          {q.optional && <button type="button" className="btn secondary" onClick={() => { const a2 = { ...answers, [q.key]: null }; setAnswers(a2); setError(null); advance(a2) }}>{t('skip')}</button>}
          {step > 0 && <button type="button" className="btn secondary" onClick={() => { setError(null); setStep(step - 1) }}>{t('back')}</button>}
        </div>
      </form>
    </div>
  )
}
