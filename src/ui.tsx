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

export function StatusLine({ status, children }: { status: Status; children: ReactNode }) {
  return <p className={`status ${status}`}><Shape status={status} /><span>{children}</span></p>
}

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang, d } = useI18n()
  return (
    <>
      <header className="site">
        <div className="wide bar">
          <a className="brand" href="#/">StreamRecord<small>{t('tagline')}</small></a>
          <nav className="main" aria-label="Main">
            <a href="#/">{t('navMap')}</a>
            <a href="#/sources">{t('navSources')}</a>
          </nav>
          <div className="lang">
            <label htmlFor="lang">{t('language')}</label>
            <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code === 'no' ? 'nb' : l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>
        {d.meta && (d.meta as any).reviewed === false && <div className="wide"><p className="meta" role="note">{t('machineTr')}</p></div>}
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
