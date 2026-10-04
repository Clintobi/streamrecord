import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

interface Meta {
  sources: { title: string; publisher: string; url: string; licence: string; retrieved: string; sha256?: string; note?: string }[]
  realVsSynthetic: { item: string; status: string; note: string }[]
  fhir: { igRepo?: string; commit?: string; package?: string; profilesVerified?: string[]; profilesNotUsed?: string[]; localCodes?: { code: string; why: string }[] }
  evidence?: { validate?: { resource: string; server: string; profile?: string; errors: number; warnings: number; at: string }[]; tests?: string; lighthouse?: string; bundleKb?: string; firstReading?: string }
}

export default function Sources() {
  const { t } = useI18n()
  const [m, setM] = useState<Meta | null>(null)
  useEffect(() => { fetch('./data/meta.json').then((r) => r.json()).then(setM).catch(() => setM(null)) }, [])
  return (
    <div className="wrap sources">
      <h1>{t('sourcesTitle')}</h1>
      {!m ? <p className="meta">Loading.</p> : (
        <>
          <h2>Sources and licences</h2>
          <div className="tablewrap"><table><thead><tr><th>Source</th><th>Licence</th><th>Retrieved</th></tr></thead><tbody>
            {m.sources.map((s) => <tr key={s.url}><td><a href={s.url}>{s.title}</a><br /><span className="meta">{s.publisher}{s.note ? `. ${s.note}` : ''}</span>{s.sha256 && <><br /><span className="mono meta">sha256 {s.sha256.slice(0, 16)}…</span></>}</td><td>{s.licence}</td><td className="nw num">{s.retrieved}</td></tr>)}
          </tbody></table></div>

          <h2>What is real and what is synthetic</h2>
          <div className="tablewrap"><table><thead><tr><th>Item</th><th>Status</th><th>Note</th></tr></thead><tbody>
            {m.realVsSynthetic.map((r) => <tr key={r.item}><td>{r.item}</td><td>{r.status}</td><td>{r.note}</td></tr>)}
          </tbody></table></div>

          <h2>FHIR</h2>
          <p>Implementation guide pinned at commit <code>{m.fhir.commit}</code>{m.fhir.package ? <> (package <code>{m.fhir.package}</code>)</> : null}{m.fhir.igRepo ? <>, <a href={m.fhir.igRepo}>source</a></> : null}.</p>
          {m.fhir.profilesVerified?.length ? <p>Profiles verified at that commit: {m.fhir.profilesVerified.map((p) => <code key={p} style={{ marginRight: 8 }}>{p}</code>)}</p> : null}
          {m.fhir.profilesNotUsed?.length ? <p>Profiles checked but not used: {m.fhir.profilesNotUsed.join('; ')}.</p> : null}
          {m.fhir.localCodes?.length ? (<><p>Local codes, and why:</p><ul>{m.fhir.localCodes.map((c) => <li key={c.code}><code>{c.code}</code>: {c.why}</li>)}</ul></>) : null}

          {m.evidence && (
            <>
              <h2>Evidence</h2>
              {m.evidence.validate?.length ? (
                <div className="tablewrap"><table><thead><tr><th>Resource</th><th>Server</th><th>Checked against</th><th>Errors</th><th>Warnings</th><th>Checked</th></tr></thead><tbody>
                  {m.evidence.validate.map((v, i) => <tr key={i}><td>{v.resource}</td><td className="mono">{v.server}</td><td>{v.profile || 'base R4'}</td><td>{v.errors}</td><td>{v.warnings}</td><td className="nw num">{v.at}</td></tr>)}
                </tbody></table></div>) : null}
              {m.evidence.tests && <p>Unit tests: {m.evidence.tests}</p>}
              {m.evidence.lighthouse && <p>Lighthouse (mobile): {m.evidence.lighthouse}</p>}
              {m.evidence.bundleKb && <p>JavaScript for the first view: {m.evidence.bundleKb}</p>}
              {m.evidence.firstReading && <p>Time to the first Site Reading (simulated mobile 4G): {m.evidence.firstReading}</p>}
              <p className="meta">Warnings are "CodeSystem unknown" or "Questionnaire could not be resolved": the public servers do not hold the OneAquaHealth or StreamRecord terminology. Our own definitions are published at <a href="./fhir/Questionnaire/streamrecord-check">Questionnaire</a> and <a href="./fhir/CodeSystem/streamrecord-local">CodeSystem</a>. <a href="./evidence/sample-bundle.json">Sample bundle</a>.</p>
            </>
          )}
        </>
      )}
    </div>
  )
}
