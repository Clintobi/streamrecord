import { useEffect, useRef, useState } from 'react'
import { CityIndex, Site } from '../model'
import { Library, loadCities, loadCity, loadLibrary } from '../data'
import { useI18n } from '../i18n'
import { ReadAloud, Skeleton } from '../ui'

// Seven chapters, each built on verbatim OneAquaHealth Policy Brief findings (page-cited),
// joined by one short line of our own that points to real sites in the data.
const CHAPTERS: { key: string; quotes: string[] }[] = [
  { key: 'c1', quotes: ['E1'] },
  { key: 'c2', quotes: ['E2'] },
  { key: 'c3', quotes: ['E3', 'E4'] },
  { key: 'c4', quotes: ['E5'] },
  { key: 'c5', quotes: ['E6', 'E7'] },
  { key: 'c6', quotes: ['E8', 'E9'] },
  { key: 'c7', quotes: ['E10', 'E11', 'E12'] },
]

const QUIZ: { key: string; options: string[]; answer: number; quote: string }[] = [
  { key: 'q1', options: ['q1a', 'q1b', 'q1c'], answer: 2, quote: 'E3' },
  { key: 'q2', options: ['q2a', 'q2b', 'q2c'], answer: 1, quote: 'E4' },
  { key: 'q3', options: ['q3a', 'q3b', 'q3c'], answer: 1, quote: 'E10' },
]

function Quote({ id, lib }: { id: string; lib: Library }) {
  const { t, lang } = useI18n()
  const q = lib.story?.quotes[id]
  if (!q) return null
  const local = q[lang]
  const use = local || q.en
  const pb = lib.policyBrief
  const url = use.edition === 'zenodo' ? lib.story!.zenodo : pb?.url
  return (
    <figure className="quote">
      <blockquote style={{ margin: 0 }} data-read lang={local ? (lang === 'no' ? 'nb' : lang) : 'en'}><p>“{use.text}”</p></blockquote>
      <figcaption>
        {t('fromOAH')}, Policy Brief{use.edition === 'zenodo' ? ` (${t('officialTr')})` : pb?.date ? ` (${pb.date})` : ''}, {t('page')}{' '}{use.page}{url ? <>, <a href={url}>source</a></> : null}
        {!local && lang !== 'en' && <> · {t('quoteEnglish')}</>}
      </figcaption>
    </figure>
  )
}

function Quiz({ lib }: { lib: Library }) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<Record<string, number>>({})
  const score = QUIZ.filter((q) => picked[q.key] === q.answer).length
  const done = QUIZ.every((q) => picked[q.key] !== undefined)
  return (
    <section className="quiz" aria-labelledby="quiz-h">
      <h2 id="quiz-h">{t('quizTitle')}</h2>
      <p className="meta">{t('quizIntro')}</p>
      {QUIZ.map((q, n) => {
        const p = picked[q.key]
        return (
          <fieldset key={q.key} className="quizq">
            <legend><span className="num">{n + 1}.</span> {t(q.key as any)}</legend>
            <div className="quizopts">
              {q.options.map((o, i) => {
                const state = p === undefined ? '' : i === q.answer ? ' right' : i === p ? ' wrong' : ''
                return (
                  <label key={o} className={`quizopt${state}`}>
                    <input type="radio" name={q.key} checked={p === i} onChange={() => setPicked((s) => ({ ...s, [q.key]: i }))} />
                    <span>{t(o as any)}</span>
                  </label>
                )
              })}
            </div>
            <div aria-live="polite">
              {p !== undefined && (
                <div className={`quizfb ${p === q.answer ? 'right' : 'wrong'}`}>
                  <p><strong>{p === q.answer ? t('quizRight') : t('quizWrong')}</strong> {t(`${q.key}why` as any)}</p>
                  <Quote id={q.quote} lib={lib} />
                </div>
              )}
            </div>
          </fieldset>
        )
      })}
      {done && <p className="quizscore" role="status">{t('quizScore', { n: score, total: QUIZ.length })}</p>}
    </section>
  )
}

export default function Story() {
  const { t, lang } = useI18n()
  const [lib, setLib] = useState<Library | null>(null)
  const [data, setData] = useState<{ cities: CityIndex[]; sites: Site[] } | null>(null)
  const page = useRef<HTMLElement>(null)
  useEffect(() => {
    loadLibrary().then(setLib)
    loadCities().then((cities) => Promise.all(cities.map((c) => loadCity(c.slug))).then((all) => setData({ cities, sites: all.flat() })))
  }, [])
  if (!lib || !data) return <Skeleton />

  // numbers for our own connecting lines, computed from the snapshot (never hard-coded)
  const scored = data.sites.filter((s) => typeof s.risk?.score === 'number')
  const in2023 = scored.filter((s) => (s.risk?.date || '').startsWith('2023')).length
  const top = (k: 'scaledArgRisk' | 'scaledPathogenRisk') => [...scored].sort((a, b) => ((b.risk?.parts?.[k] ?? 0) - (a.risk?.parts?.[k] ?? 0)))[0]
  const arg = top('scaledArgRisk'), path = top('scaledPathogenRisk')
  const high = scored.filter((s) => s.risk?.level === 'high').length
  const link = (s: Site) => <a href={`#/site/${encodeURIComponent(s.id)}`}>{s.name} ({s.city})</a>
  const nf = (n: number) => n.toLocaleString(lang === 'no' ? 'nb' : lang)

  const ours: Record<string, JSX.Element> = {
    c1: <>{t('s_c1', { n: nf(data.sites.length), scored: nf(scored.length), y: nf(in2023) })}</>,
    c2: <>{t('s_c2')}</>,
    c3: <>{t('s_c3')}</>,
    c4: <>{t('s_c4')}</>,
    c5: <>{t('s_c5a')} {link(arg)}{t('s_c5b')} {link(path)}. {t('s_c5c', { high: nf(high), scored: nf(scored.length) })}</>,
    c6: <>{t('s_c6')}</>,
    c7: <>{t('s_c7')}</>,
  }

  return (
    <article className="story" ref={page}>
      <header className="storyhead wide">
        <p className="eyebrow">{t('storyKicker')}</p>
        <h1 data-read>{t('storyTitle')}</h1>
        <p className="lede">{t('storyLede')}</p>
        <ReadAloud target={() => page.current} />
      </header>
      <ol className="chapters wide">
        {CHAPTERS.map((c, i) => (
          <li key={c.key} className="chapter">
            <div className="chnum" aria-hidden="true">{String(i + 1).padStart(2, '0')}</div>
            <div className="chbody">
              <h2 data-read>{t(`${c.key}t` as any)}</h2>
              {c.quotes.map((q) => <Quote key={q} id={q} lib={lib} />)}
              <p className="ours"><span className="ourslabel">{t('ourLine')}</span> {ours[c.key]}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="wide storyend">
        <div className="storycta">
          <p className="reading">{t('storyCta')}</p>
          <div className="actions">
            <a className="btn" href="#/">{t('findStream')}</a>
            <a className="btn secondary" href="#/site/C5">{t('seeExample')}</a>
          </div>
        </div>
        <Quiz lib={lib} />
        <p className="src">{t('storyNote')}</p>
      </div>
    </article>
  )
}
