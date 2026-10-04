import { useEffect, useRef, useState } from 'react'
import { Bands, findSite, Library, loadBands, loadLibrary } from '../data'
import { LANGS, useI18n } from '../i18n'
import { CityIndex, confirmedFindings, daysSince, lowerNearby, findingsFromChecks, labStatus, longDate, secondLook, Site } from '../model'
import { checksFor } from '../store'
import { ReadAloud, Shape, Skeleton, StatusLine } from '../ui'

const r2 = (v?: number | null) => (typeof v === 'number' ? v.toFixed(2) : 'n/a')

function downloadCsv(sites: Site[], cityName: string) {
  const rows = [['site_id', 'site_name', 'city', 'risk_level_ours', 'risk_score', 'scaled_pathogen', 'scaled_fecal', 'scaled_arg', 'sampled', 'source'].join(',')]
  for (const s of sites) {
    const p = s.risk?.parts || {}
    rows.push([s.id, `"${s.name.replace(/"/g, '""')}"`, s.city, s.risk?.level || '', s.risk?.score ?? '', p.scaledPathogenRisk ?? '', p.scaledFecalRisk ?? '', p.scaledArgRisk ?? '', s.risk?.date || '', 'api.enora-oah.eu'].join(','))
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
  a.download = `streamrecord-${cityName.toLowerCase()}-health-risk.csv`
  a.click()
}

// Every site in the city on one honest 0 to 1 axis, with our tertile bands shaded behind it.
// Built from positioned HTML rather than SVG so labels keep their real size on a phone.
export function Scale({ site, sites, bands, cityName }: { site: Site; sites: Site[]; bands: Bands | null; cityName: string }) {
  const { t } = useI18n()
  const others = sites.filter((s) => s.id !== site.id && typeof s.risk?.score === 'number')
  const v = site.risk?.score as number
  const t1 = bands?.tertile1 ?? 0.2269, t2 = bands?.tertile2 ?? 0.3491
  const pct = (n: number) => `${(Math.max(0, Math.min(1, n)) * 100).toFixed(2)}%`
  const anchor = v < 0.12 ? 'start' : v > 0.88 ? 'end' : 'mid'
  return (
    <figure className="scale">
      <div className="track" role="img" aria-label={`${others.length + 1} sites in ${cityName} on a 0 to 1 scale. This site scores ${r2(v)}.`}>
        <span className={`here-label ${anchor}`} style={{ left: pct(v) }} aria-hidden="true">{t('thisSite')} <b className="num">{r2(v)}</b></span>
        <div className="bands" aria-hidden="true">
          <span className="b-ok" style={{ width: pct(t1) }} />
          <span className="b-look" style={{ width: pct(t2 - t1) }} />
          <span className="b-concern" style={{ flex: 1 }} />
          {others.map((s) => <i key={s.id} style={{ left: pct(s.risk!.score as number) }} />)}
          <b className="here" style={{ left: pct(v) }} />
        </div>
        <div className="ticks" aria-hidden="true"><span>0</span><span>0.5</span><span>1</span></div>
      </div>
      <figcaption>{t('scaleCap', { city: cityName })}</figcaption>
    </figure>
  )
}

function Record({ site, sites, city, bands }: { site: Site; sites: Site[]; city: CityIndex; bands: Bands | null }) {
  const { t, lang } = useI18n()
  const r = site.risk
  const age = daysSince(r?.date)
  if (!r || r.level === 'unknown' || typeof r.score !== 'number') {
    return (
      <section className="record" aria-labelledby="b1">
        <h2 id="b1" className="sr-only">{t('b1')}</h2>
        <div className="rhead" style={{ paddingBottom: 'var(--s3)' }}><StatusLine status="none">{t('statusNoLab')}</StatusLine></div>
        <div className="rfoot"><p className="src">{t('b1None')} <a href="#/sources">ENORA OneAquaHealth API</a></p></div>
      </section>
    )
  }
  const p = r.parts || {}
  const parts: [string, number | null | undefined][] = [[t('partPathogen'), p.scaledPathogenRisk], [t('partFecal'), p.scaledFecalRisk], [t('partArg'), p.scaledArgRisk]]
  return (
    <section className="record" aria-labelledby="b1">
      <h2 id="b1" className="sr-only">{t('b1')}</h2>
      <div className="rhead">
        <div data-read><StatusLine status={labStatus(site)} size={18}>{t(`head_${r.level}` as any)}</StatusLine></div>
        <p className="score" style={{ margin: 0 }}><strong>{r2(r.score)}</strong> {t('scoreOf')}</p>
      </div>
      <div>
        {age !== null && <p className="when" data-read>{t('sampledAgo', { date: longDate(r.date, lang), days: age.toLocaleString(lang === 'no' ? 'nb' : lang) })}</p>}
        <Scale site={site} sites={sites} bands={bands} cityName={city.name} />
      </div>
      <dl className="parts">
        {parts.map(([label, val]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt>{label}</dt>
            <dd className="meter" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(1, val ?? 0)) * 100}%` }} /></dd>
            <dd className="v">{r2(val)}</dd>
          </div>
        ))}
      </dl>
      <p className="partscap">{t('partsCap')}</p>
      <div className="rfoot">
        <p className="src">{t('source')}: <a href="#/sources">ENORA OneAquaHealth API, health-risk snapshot</a></p>
        <button className="linkbtn" onClick={() => downloadCsv(sites, city.name)}>{t('downloadCsv')}</button>
      </div>
    </section>
  )
}

const ROLES = ['parent', 'dog', 'walker', 'garden', 'gp'] as const
type Role = typeof ROLES[number]
const ROLE_KEY = 'streamrecord.role'

// "This stream, for you": the same record, told for the person reading it.
function ForYou({ site, findings }: { site: Site; findings: string[] }) {
  const { t, d } = useI18n()
  const [role, setRole] = useState<Role | null>(() => { try { return (localStorage.getItem(ROLE_KEY) as Role) || null } catch { return null } })
  const pick = (r: Role) => { setRole(r); try { localStorage.setItem(ROLE_KEY, r) } catch { /* per-device convenience only */ } }
  const F = d.findings as Record<string, any>
  const lvl = site.risk && site.risk.level !== 'unknown' ? site.risk.level : 'none'
  const line = (f: string) => role === 'dog' ? F[f]?.animals : role === 'gp' ? F[f]?.clin?.may : F[f]?.people
  return (
    <section className="foryou" aria-labelledby="foryou-h">
      <h2 id="foryou-h">{t('youTitle')}</h2>
      <fieldset>
        <legend className="meta">{t('youIntro')}</legend>
        <div className="roles">
          {ROLES.map((r) => (
            <label key={r} className="role">
              <input type="radio" name="role" checked={role === r} onChange={() => pick(r)} />
              <span>{t(`role_${r}` as any)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {role && (
        <div className="youcard" aria-live="polite">
          <p className="youline" data-read>{role === 'gp' ? t('you_gp') : t(`you_${role}_${lvl}` as any)}</p>
          {role === 'gp' && <a className="btn small" href={`#/clinician/${encodeURIComponent(site.id)}`}>{t('openClinician')}</a>}
          {findings.length > 0 && (
            <>
              <h3>{t('youSigns')}</h3>
              <ul>{findings.map((f) => <li key={f} data-read><strong>{F[f]?.label}.</strong> {line(f)}</li>)}</ul>
            </>
          )}
          <p className="meta">{t('youNote')}</p>
        </div>
      )}
    </section>
  )
}

export default function SiteReading({ id }: { id: string }) {
  const { t, d, lang, setLang } = useI18n()
  const [data, setData] = useState<{ site: Site; city: CityIndex; sites: Site[] } | null | undefined>(undefined)
  const [lib, setLib] = useState<Library>({})
  const [bands, setBands] = useState<Bands | null>(null)
  const page = useRef<HTMLElement>(null)
  useEffect(() => { findSite(id).then(setData); loadLibrary().then(setLib); loadBands().then(setBands) }, [id])

  if (data === undefined) return <Skeleton />
  if (data === null) return <div className="wrap"><h1>Site not found</h1><p><a href="#/">Back to the map</a></p></div>
  const { site, city, sites } = data
  const checks = checksFor(site.id)
  const findings = findingsFromChecks(checks)
  const confirmed = confirmedFindings(checks)
  const flags = [...new Set(checks.filter((c) => c.status === 'preliminary').flatMap((c) => secondLook(c.answers)))]
  const F = d.findings as Record<string, any>
  // rank measures by how many of this site's findings they address (the mapping is our judgement, said on screen)
  const hits = (m: { addresses: string[] }) => m.addresses.filter((a) => findings.includes(a)).length
  const matched = (lib.measures || []).filter((m) => hits(m) > 0).sort((a, b) => hits(b) - hits(a)).slice(0, 3)
  const measures = matched.length ? matched : (lib.measures || []).filter((m) => /pollution|riparian/i.test(`${m.category} ${m.name}`)).slice(0, 2)
  const cat = lib.sources?.catalogue
  const pb = lib.policyBrief
  const cityLang = city.lang !== lang && LANGS.some((l) => l.code === city.lang) ? city.lang : null

  return (
    <article ref={page}>
      <div className="wide site-wide">
        <div className="site-grid">
          <div className="sitehead-col">
            <nav className="crumbs noprint" aria-label="Breadcrumb">
              <a href={`#/city/${city.slug}`}>← {t('backTo', { city: city.name })}</a>
              {cityLang && (
                <button className="btn secondary small" onClick={() => setLang(cityLang)} lang={cityLang === 'no' ? 'nb' : cityLang}>
                  {({ pt: 'Ler em português', it: 'Leggi in italiano', nl: 'Lees in het Nederlands', no: 'Les på norsk', fr: 'Lire en français', en: 'Read in English' } as Record<string, string>)[cityLang]}
                </button>
              )}
            </nav>
            <header className="sitehead">
              <p className="eyebrow">{t('siteEyebrow', { city: city.name, id: site.id })}</p>
              <h1 data-read>{site.name}</h1>
              {site.unnamed && <p className="meta">{t('unnamedNote')}</p>}
            </header>
            <Record site={site} sites={sites} city={city} bands={bands} />
            <ForYou site={site} findings={findings} />
            {lowerNearby(site, sites).length > 0 && (
              <section className="nearby" aria-labelledby="nearby-h">
                <h2 id="nearby-h">{t('nearbyTitle')}</h2>
                <ul>
                  {lowerNearby(site, sites).map(({ site: s, km }) => (
                    <li key={s.id}>
                      <a href={`#/site/${encodeURIComponent(s.id)}`}><Shape status="ok" /><span className="nm">{s.name}</span></a>
                      <span className="meta"><span className="num">{(s.risk!.score as number).toFixed(2)}</span> · {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</span>
                    </li>
                  ))}
                </ul>
                <p className="meta">{t('nearbyNote')}</p>
              </section>
            )}
            <div className="actions noprint">
              <ReadAloud target={() => page.current} />
              <a className="btn" href={`#/check/${encodeURIComponent(site.id)}`}>{t('doCheck')}</a>
              <a className="btn secondary" href={`#/clinician/${encodeURIComponent(site.id)}`}>{t('clinicianLink')}</a>
            </div>
          </div>
        </div>
      </div>

      <div className="wide sections">
        <section className="sec" aria-labelledby="b2">
          <h2 id="b2" data-read>{t('b2')}</h2>
          <div className="body" data-read>
            {checks.length === 0 ? <p className="reading empty">{t('b2Empty')}</p> : (
              <>
                <p className="meta">{t('checksN', { n: checks.length })}</p>
                {findings.length === 0 ? <p className="reading">{t('b3Nothing')}</p> : (
                  <ul className="findings">
                    {findings.map((f) => <li key={f}><Shape status={confirmed.has(f) ? 'concern' : 'look'} /><span>{F[f]?.label}</span><span className={`tag${confirmed.has(f) ? ' strong' : ''}`}>{confirmed.has(f) ? t('confirmedTag') : t('preliminary')}</span></li>)}
                  </ul>
                )}
                {(() => {
                  // residents' own overall view and feelings, from checks that still count
                  const live = checks.filter((c) => c.status !== 'entered-in-error')
                  const Q = d.questions as Record<string, any>
                  const tally = (key: string, multi: boolean) => {
                    const n: Record<string, number> = {}
                    for (const c of live) { const a = c.answers[key]; for (const v of multi ? (Array.isArray(a) ? a : []) : [a]) if (typeof v === 'string' && v !== 'unsure' && v !== 'none') n[v] = (n[v] || 0) + 1 }
                    return Object.entries(n).map(([k, v]) => `${Q[key]?.a[k]?.split(':')[0]} (${v})`).join(' · ')
                  }
                  const view = tally('overallAssessment', false), feel = tally('feelings', true)
                  return (view || feel) ? (
                    <dl className="views">
                      {view && <><dt>{t('residentsView')}</dt><dd>{view}</dd></>}
                      {feel && <><dt>{t('residentsFeel')}</dt><dd>{feel}</dd></>}
                    </dl>
                  ) : null
                })()}
                {flags.length > 0 && (
                  <div className="secondlook" role="note">
                    <p className="status look"><Shape status="look" />{t('secondLookSite')}</p>
                    <ul>{flags.map((f) => <li key={f}>{t(`flag_${f}` as any)}</li>)}</ul>
                    <a href="#/review">{t('openQueue')}</a>
                  </div>
                )}
              </>
            )}
            <p className="src">{t('source')}: citizen checks with StreamRecord, stored on this phone</p>
          </div>
        </section>

        <section className="sec" aria-labelledby="b3">
          <h2 id="b3" data-read>{t('b3')}</h2>
          <div className="body" data-read>
            {findings.length === 0 ? <p className="reading empty">{t('b3Nothing')}</p> : (
              <>
                <p className="reading">{t('b3Intro')}</p>
                {findings.map((f) => (
                  <div key={f} className="finding">
                    <h3>{F[f]?.label}</h3>
                    <div className="three">
                      <section><h4>{t('people')}</h4><p>{F[f]?.people}</p></section>
                      <section><h4>{t('animals')}</h4><p>{F[f]?.animals}</p></section>
                      <section><h4>{t('stream')}</h4><p>{F[f]?.stream}</p></section>
                    </div>
                  </div>
                ))}
              </>
            )}
            <p className="src">{t('source')}: <a href={`#/clinician/${encodeURIComponent(site.id)}`}>{t('disclaimer')}</a></p>
          </div>
        </section>

        <section className="sec" aria-labelledby="b4">
          <h2 id="b4">{t('b4')}</h2>
          <div className="body">
            {matched.length > 0 && <p className="reading">{t('b4Intro')}</p>}
            {measures.length === 0 ? <p className="meta">Catalogue of Measures not loaded.</p> : (
              <ul className="measures">
                {measures.map((m) => (
                  <li key={m.id}>
                    {m.category && <p className="cat">{m.category.charAt(0).toUpperCase() + m.category.slice(1)}</p>}
                    <h3>{m.name}</h3>
                    <p>{m.oneLine}</p>
                    {m.quote && <p className="excerpt">“{m.quote}”</p>}
                    <p className="cite">{t('fromOAH')}, Catalogue of Measures, {t('page')}{'\u00a0'}{m.page}{cat ? <>, <a href={cat.url}>source</a></> : null}</p>
                  </li>
                ))}
              </ul>
            )}
            {measures.length > 0 && <p className="src">{matched.length ? "Which measure fits which sign is our judgement from each measure's stated aims; the Catalogue does not make that link itself." : 'No signs reported here yet, so these are general measures for urban streams.'}</p>}
          </div>
        </section>

        {pb && pb.quotes?.length ? (
          <section className="sec" aria-labelledby="why">
            <h2 id="why">{t('whyCity')}</h2>
            <div className="body">
              {pb.quotes.slice(0, 3).map((q, i) => (
                <figure key={i} className="quote">
                  <blockquote style={{ margin: 0 }}><p>“{q.text}”</p></blockquote>
                  <figcaption>{t('fromOAH')}, Policy Brief{pb.date ? ` (${pb.date})` : ''}, {t('page')}{'\u00a0'}{q.page}{pb.url ? <>, <a href={pb.url}>source</a></> : null}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  )
}
