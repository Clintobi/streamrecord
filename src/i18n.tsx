import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import en from './i18n/en.json'
import { fmt } from './model'

export type Dict = typeof en
export const LANGS: { code: string; name: string }[] = [
  { code: 'en', name: 'English' }, { code: 'pt', name: 'Português' }, { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' }, { code: 'no', name: 'Norsk' }, { code: 'fr', name: 'Français' },
]
const loaders = import.meta.glob('./i18n/*.json') as Record<string, () => Promise<{ default: Dict }>>

interface Ctx { lang: string; d: Dict; setLang: (l: string) => void; t: (k: keyof Dict['ui'], v?: Record<string, string | number>) => string }
const I18n = createContext<Ctx>(null!)

function initialLang(): string {
  try { const s = localStorage.getItem('streamrecord.lang'); if (s) return s } catch { /* */ }
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLang)
  const [d, setD] = useState<Dict>(en)
  useEffect(() => {
    document.documentElement.lang = lang === 'no' ? 'nb' : lang
    const load = loaders[`./i18n/${lang}.json`]
    if (lang === 'en' || !load) { setD(en); return }
    load().then((m) => setD(merge(en, m.default)))
  }, [lang])
  const setLang = (l: string) => { setLangState(l); try { localStorage.setItem('streamrecord.lang', l) } catch { /* */ } }
  const t: Ctx['t'] = (k, v) => fmt((d.ui as any)[k] ?? (en.ui as any)[k] ?? String(k), v || {})
  return <I18n.Provider value={{ lang, d, setLang, t }}>{children}</I18n.Provider>
}
export const useI18n = () => useContext(I18n)

// fall back to English for any missing key
function merge(base: any, over: any): any {
  if (typeof base !== 'object' || base === null) return over ?? base
  const out: any = Array.isArray(base) ? [...base] : { ...base }
  for (const k of Object.keys(over || {})) out[k] = typeof base[k] === 'object' && base[k] !== null ? merge(base[k], over[k]) : over[k]
  return out
}
