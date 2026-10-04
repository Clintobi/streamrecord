import { useEffect, useRef, useState } from 'react'
import { Library, loadCities, loadCity, loadLibrary } from '../data'
import { fetchRain, RainState } from '../today'
import { useI18n } from '../i18n'
import { CityIndex, labStatus, longDate, Site } from '../model'
import { Shape, Skeleton } from '../ui'

const SHAPE_HTML: Record<string, string> = {
  ok: '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="#009E73" stroke="#1B2A2F" stroke-width="2"/></svg>',
  look: '<svg width="16" height="16" viewBox="0 0 14 14"><path d="M7 1.4 12.8 12.4H1.2Z" fill="#E69F00" stroke="#1B2A2F" stroke-width="1.8"/></svg>',
  concern: '<svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="10" height="10" fill="#D55E00" stroke="#1B2A2F" stroke-width="2"/></svg>',
  none: '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="#FFFFFF" stroke="#1B2A2F" stroke-width="2"/></svg>',
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function MapScreen({ city }: { city?: string }) {
  const { t, lang } = useI18n()
  const [cities, setCities] = useState<CityIndex[] | null>(null)
  const [slug, setSlug] = useState<string | undefined>(city)
  const [sites, setSites] = useState<Site[] | null>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)

  const [lib, setLib] = useState<Library>({})
  const [cityRain, setCityRain] = useState<RainState | null>(null)
  useEffect(() => { loadLibrary().then(setLib) }, [])
  useEffect(() => { loadCities().then((c) => { setCities(c); setSlug((s) => s || c.find((x) => x.slug === 'coimbra')?.slug || c[0]?.slug) }) }, [])
  useEffect(() => { if (slug) { setSites(null); loadCity(slug).then(setSites) } }, [slug])
  // start fetching the map code while the site data loads, rather than after
  const leaflet = useRef<Promise<any> | null>(null)
  if (!leaflet.current) leaflet.current = Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([m]) => m.default)

  // map is lazy-loaded after the list has rendered
  useEffect(() => {
    if (!sites || !cities || !slug || !mapEl.current) return
    let cancelled = false
    ;(async () => {
      const L = await leaflet.current!
      if (cancelled || !mapEl.current) return
      if (!mapRef.current) {
        mapRef.current = L.map(mapEl.current, { scrollWheelZoom: false })
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Basemap &copy; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 16,
        }).addTo(mapRef.current)
      }
      layerRef.current?.remove()
      const group = L.layerGroup()
      for (const s of sites) {
        const icon = L.divIcon({ className: 'sr-marker', html: SHAPE_HTML[labStatus(s)], iconSize: [28, 28], iconAnchor: [14, 14] })
        L.marker([s.lat, s.lon], { icon, title: s.name, keyboard: true, zIndexOffset: ({ concern: 300, look: 200, ok: 100, none: 0 } as Record<string, number>)[labStatus(s)] })
          .on('click', () => { location.hash = `#/site/${encodeURIComponent(s.id)}` })
          .addTo(group)
      }
      group.addTo(mapRef.current)
      layerRef.current = group
      const pts = sites.map((s) => [s.lat, s.lon]) as [number, number][]
      if (pts.length) mapRef.current.fitBounds(pts, { padding: [24, 24], maxZoom: 14 })
    })()
    return () => { cancelled = true }
  }, [sites, cities, slug])

  useEffect(() => {
    const c = cities?.find((x) => x.slug === slug)
    if (!c) return
    setCityRain(null)
    const ac = new AbortController()
    fetchRain(c.center[0], c.center[1], ac.signal).then(setCityRain)
    return () => ac.abort()
  }, [slug, cities])

  if (!cities) return <Skeleton />
  const cur = cities.find((c) => c.slug === slug)
  const dates = (sites || []).map((s) => s.risk?.date).filter(Boolean).sort() as string[]
  const scored = (sites || []).filter((s) => typeof s.risk?.score === 'number').length

  return (
    <div className="wide">
      <a className="homestat" href="#/story">
        {(() => {
          // official translation from the Policy Brief's multilingual edition when available, else the English
          const q = lib.story?.quotes.E3
          const use = q ? q[lang] || q.en : null
          return use ? <>
            <span className="hs-quote" lang={q![lang] ? (lang === 'no' ? 'nb' : lang) : 'en'}>“{use.text}”</span>
            <span className="hs-cite">OneAquaHealth Policy Brief{use.edition === 'zenodo' ? ` (${t('officialTr')})` : ''}, {t('page')}{'\u00a0'}{use.page}</span>
          </> : <span className="hs-quote">&nbsp;</span>
        })()}
        <span className="hs-line">{t('homeStatLine')}</span>
        <span className="hs-cta">{t('readStory')} →</span>
      </a>
      <h1>{t('mapTitle')}</h1>
      <p className="lede">{t('mapIntro')}</p>
      <div className="cities" role="group" aria-label="City">
        {cities.map((c) => (
          <button key={c.slug} aria-pressed={c.slug === slug} onClick={() => setSlug(c.slug)}>{c.name}<span className="n">{c.count}</span></button>
        ))}
      </div>
      <div className="cityline">
        <p className="meta">{cityRain && <span className={`cityrain r-${cityRain.level}`}>{t('cityRain', { city: cur?.name || '', mm: cityRain.sum72 })} · </span>}{sites && dates.length ? t('cityLine', { n: sites.length, scored, from: longDate(dates[0], lang), to: longDate(dates[dates.length - 1], lang) }) : '\u00a0'}</p>
        <ul className="legend" aria-label="Legend">
          {(['ok', 'look', 'concern'] as const).map((st, i) => <li key={st}><Shape status={st} />{cap(t(`level_${['low', 'moderate', 'high'][i]}` as any))}</li>)}
          <li><Shape status="none" />{t('legendNone')}</li>
        </ul>
      </div>
      <div className="maplayout">
        <div ref={mapEl} id="map" role="region" aria-label={cur ? `Map of sites in ${cur.name}. The same sites are listed next to the map.` : 'Map'} />
        <section aria-labelledby="listh">
          <div className="listhead">
            <h2 id="listh">{t('listTitle', { city: cur?.name || '' })}</h2>
            <span className="meta">{t('listScore')}</span>
          </div>
          {!sites ? <Skeleton /> : (
            <ul className="sitelist">
              {sites.map((s) => {
                const st = labStatus(s)
                const has = s.risk && s.risk.level !== 'unknown'
                return (
                  <li key={s.id}>
                    <a href={`#/site/${encodeURIComponent(s.id)}`}>
                      <Shape status={st} />
                      <span className="nm">{s.name}</span>
                      <span className={`sc${has ? '' : ' none'}`}>{has && typeof s.risk!.score === 'number' ? s.risk!.score.toFixed(2) : '–'}</span>
                      <span className="sub">{has ? `${cap(t(`level_${s.risk!.level}` as any))} · ${longDate(s.risk!.date, lang)}` : cap(t('level_unknown'))}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
