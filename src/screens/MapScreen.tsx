import { useEffect, useRef, useState } from 'react'
import { loadCities, loadCity } from '../data'
import { useI18n } from '../i18n'
import { CityIndex, labStatus, Site } from '../model'
import { Shape, Skeleton } from '../ui'

const SHAPE_HTML: Record<string, string> = {
  ok: '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="#009E73" stroke="#1B2A2F" stroke-width="2"/></svg>',
  look: '<svg width="16" height="16" viewBox="0 0 14 14"><path d="M7 1.4 12.8 12.4H1.2Z" fill="#E69F00" stroke="#1B2A2F" stroke-width="1.8"/></svg>',
  concern: '<svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="10" height="10" fill="#D55E00" stroke="#1B2A2F" stroke-width="2"/></svg>',
  none: '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="#FFFFFF" stroke="#1B2A2F" stroke-width="2"/></svg>',
}

export default function MapScreen({ city }: { city?: string }) {
  const { t } = useI18n()
  const [cities, setCities] = useState<CityIndex[] | null>(null)
  const [slug, setSlug] = useState<string | undefined>(city)
  const [sites, setSites] = useState<Site[] | null>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)

  useEffect(() => { loadCities().then((c) => { setCities(c); setSlug((s) => s || c.find((x) => x.slug === 'coimbra')?.slug || c[0]?.slug) }) }, [])
  useEffect(() => { if (slug) { setSites(null); loadCity(slug).then(setSites) } }, [slug])

  // map is lazy-loaded after the list has rendered
  useEffect(() => {
    if (!sites || !cities || !slug || !mapEl.current) return
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapEl.current) return
      if (!mapRef.current) {
        mapRef.current = L.map(mapEl.current, { scrollWheelZoom: false })
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd', maxZoom: 19,
        }).addTo(mapRef.current)
      }
      layerRef.current?.remove()
      const group = L.layerGroup()
      for (const s of sites) {
        const icon = L.divIcon({ className: 'sr-marker', html: SHAPE_HTML[labStatus(s)], iconSize: [16, 16], iconAnchor: [8, 8] })
        L.marker([s.lat, s.lon], { icon, title: s.name, keyboard: true })
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

  if (!cities) return <Skeleton />
  const cur = cities.find((c) => c.slug === slug)

  return (
    <div className="wide">
      <h1>{t('mapTitle')}</h1>
      <p className="reading" style={{ maxWidth: '68ch' }}>{t('mapIntro')}</p>
      <div className="citybar" role="group" aria-label="City">
        {cities.map((c) => (
          <button key={c.slug} aria-pressed={c.slug === slug} onClick={() => setSlug(c.slug)}>{c.name} ({c.count})</button>
        ))}
      </div>
      <div className="maplayout">
        <div ref={mapEl} id="map" role="img" aria-label={cur ? `Map of sites in ${cur.name}. The same sites are listed next to the map.` : 'Map'} />
        <section aria-labelledby="listh">
          <h2 id="listh" style={{ marginTop: 0 }}>{t('listTitle', { city: cur?.name || '' })}</h2>
          {!sites ? <Skeleton /> : (
            <ul className="sitelist">
              {sites.map((s) => {
                const st = labStatus(s)
                return (
                  <li key={s.id}>
                    <a href={`#/site/${encodeURIComponent(s.id)}`}>
                      <Shape status={st} />
                      <span><strong>{s.name}</strong>
                        <span className="meta">{s.risk && s.risk.level !== 'unknown' ? `${t('statusLab', { level: t(`level_${s.risk.level}` as any), date: s.risk.date || '' })}` : t('level_unknown')}</span>
                      </span>
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
