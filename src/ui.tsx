import { ReactNode, useEffect, useState } from 'react'
import { LANGS, useI18n } from './i18n'
import { Status } from './model'
import { allChecks } from './store'

export function Shape({ status, size = 14 }: { status: Status; size?: number }) {
  const s = size
  if (status === 'ok') return <svg width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="var(--map-ok)" stroke="var(--ink)" strokeWidth="1.5" /></svg>
  if (status === 'look') return <svg width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.2 13 12.6H1Z" fill="var(--map-look)" stroke="var(--ink)" strokeWidth="1.5" /></svg>
  if (status === 'concern') return <svg width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><rect x="1.5" y="1.5" width="11" height="11" fill="var(--map-concern)" stroke="var(--ink)" strokeWidth="1.5" /></svg>
  return <svg width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="#fff" stroke="var(--ink-2)" strokeWidth="1.5" strokeDasharray="2 2" /></svg>
}

export function StatusLine({ status, children, size = 16 }: { status: Status; children: ReactNode; size?: number }) {
  return <p className={`status ${status}`}><Shape status={status} size={size} /><span>{children}</span></p>
}

// The mark: two stream lines and a record tick, drawn on the 24px grid.
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <rect x="0.5" y="0.5" width="25" height="25" rx="2" fill="var(--stream)" />
      <path d="M4 10.5c3-2.4 6 2.4 9 0s6-2.4 9 0" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 16.5c3-2.4 6 2.4 9 0s6-2.4 9 0" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Layout({ children, route }: { children: ReactNode; route: string }) {
  const { t, lang, setLang, d } = useI18n()
  const pending = allChecks().filter((c) => c.status === 'preliminary').length
  const onStreams = route === '' || route === 'city' || route === 'site' || route === 'check' || route === 'clinician' || route === 'sign'
  return (
    <>
      <header className="site">
        <div className="wide bar">
          <a className="brand" href="#/" aria-label={`StreamRecord, ${t('tagline')}`}><Mark /><b>StreamRecord</b><small>{t('tagline')}</small></a>
          <nav className="main" aria-label="Main">
            <a href="#/" aria-current={onStreams ? 'page' : undefined}>{t('navMap')}</a>
            <a href="#/story" aria-current={route === 'story' ? 'page' : undefined}>{t('navStory')}</a>
            <a href="#/review" aria-current={route === 'review' ? 'page' : undefined}>{t('navReview')}{pending > 0 && <span className="count" aria-label={`, ${pending} ${t('st_preliminary').toLowerCase()}`}>{pending}</span>}</a>
            <a href="#/sources" aria-current={route === 'sources' ? 'page' : undefined}>{t('navSources')}</a>
          </nav>
          <div className="lang">
            <label htmlFor="lang" className="sr-only">{t('language')}</label>
            <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code === 'no' ? 'nb' : l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>
        {d.meta && (d.meta as any).reviewed === false && <div className="mtnote"><div className="wide"><p role="note">{t('machineTr')}</p></div></div>}
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
      <footer className="site">
        <div className="wide">
          <p>StreamRecord is an independent hackathon project for the OneAquaHealth IEEE Global Hackathon 2026. Not affiliated with OneAquaHealth. Lab data and findings quoted from OneAquaHealth publications and the ENORA OneAquaHealth API, with sources on every block. <a href="#/sources">Sources and data</a>.</p>
        </div>
      </footer>
    </>
  )
}

export function Skeleton() {
  return <div className="wrap" aria-busy="true" aria-live="polite"><span className="sr-only">Loading</span><div className="skeleton" style={{ width: '40%' }} /><div className="skeleton" style={{ width: '80%', height: '2em' }} /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" style={{ width: '60%' }} /></div>
}

// Reads the marked parts of a page aloud with the browser's own speech, in the reading language.
// Hidden where speech synthesis isn't available. Nothing leaves the device.
export function ReadAloud({ target }: { target: () => HTMLElement | null }) {
  const { t, lang } = useI18n()
  const [on, setOn] = useState(false)
  useEffect(() => () => { if ('speechSynthesis' in window) speechSynthesis.cancel() }, [])
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const bcp = ({ en: 'en-GB', pt: 'pt-PT', it: 'it-IT', nl: 'nl-BE', no: 'nb-NO', fr: 'fr-FR' } as Record<string, string>)[lang] || 'en-GB'
  const toggle = () => {
    if (on) { speechSynthesis.cancel(); setOn(false); return }
    const el = target()
    if (!el) return
    const parts = [...el.querySelectorAll<HTMLElement>('[data-read]')].map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(bcp.slice(0, 2)))
    parts.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = bcp
      if (voice) u.voice = voice
      u.rate = 0.95
      if (i === parts.length - 1) u.onend = () => setOn(false)
      speechSynthesis.speak(u)
    })
    setOn(true)
  }
  return (
    <button type="button" className="btn secondary small readaloud noprint" aria-pressed={on} onClick={toggle}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />{on ? <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}</svg>
      {on ? t('stopReading') : t('readAloud')}
    </button>
  )
}
