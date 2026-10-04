import { ReactNode } from 'react'
import { LANGS, useI18n } from './i18n'
import { Status } from './model'

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
  const onStreams = route === '' || route === 'city' || route === 'site' || route === 'check' || route === 'clinician'
  return (
    <>
      <header className="site">
        <div className="wide bar">
          <a className="brand" href="#/" aria-label={`StreamRecord, ${t('tagline')}`}><Mark /><b>StreamRecord</b><small>{t('tagline')}</small></a>
          <nav className="main" aria-label="Main">
            <a href="#/" aria-current={onStreams ? 'page' : undefined}>{t('navMap')}</a>
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
