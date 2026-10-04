import { useEffect, useState } from 'react'
import { findSite } from '../data'
import { SITE_URL, StreamFacts } from '../facts'
import { QR } from '../qr'
import { useI18n } from '../i18n'
import { CityIndex, Site } from '../model'
import { checksFor } from '../store'
import { Mark, Skeleton } from '../ui'

// An A4 sign a city can post at the stream: the Stream Facts label and a QR code to the full reading.
export default function StreamSign({ id }: { id: string }) {
  const { t } = useI18n()
  const [data, setData] = useState<{ site: Site; city: CityIndex; sites: Site[] } | null | undefined>(undefined)
  useEffect(() => { findSite(id).then(setData) }, [id])
  if (data === undefined) return <Skeleton />
  if (data === null) return <div className="wrap"><h1>Site not found</h1></div>
  const { site, city, sites } = data
  const url = `${SITE_URL}#/site/${encodeURIComponent(site.id)}`
  return (
    <div className="wrap signpage">
      <nav className="crumbs noprint" aria-label="Breadcrumb">
        <a href={`#/site/${encodeURIComponent(site.id)}`}>← {t('signBack')}</a>
        <button className="btn small" onClick={() => window.print()}>{t('signPrint')}</button>
      </nav>
      <p className="meta noprint">{t('signHint')}</p>
      <article className="sign">
        <header className="sign-head">
          <Mark size={40} />
          <div>
            <h1>{t('signTitle')}</h1>
            <p className="sign-site">{site.name} · {city.name}</p>
          </div>
        </header>
        <p className="sign-lede">{t('signLede')}</p>
        <div className="sign-body">
          <StreamFacts site={site} sites={sites} checks={checksFor(site.id)} cityName={city.name} />
          <div className="sign-qr">
            <QR text={url} size={220} label={`QR code linking to ${url}`} />
            <p><strong>{t('factsScan')}</strong></p>
            <p className="mono sign-url">{url.replace('https://', '')}</p>
            <p className="sign-langs" lang="mul">Português · Italiano · Nederlands · Norsk · Français · English</p>
          </div>
        </div>
        <p className="sign-by">{t('signBy')}</p>
      </article>
    </div>
  )
}
