import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { globSync } from 'glob'

const LOCALES_DIR = 'src/platform/i18n/locales'
const SRC_GLOB = 'src/**/*.{ts,tsx}'

type Json = { [k: string]: Json } | string | number | boolean | null

const flatten = (obj: Json, prefix = ''): string[] => {
  if (typeof obj !== 'object' || obj === null) return [prefix.slice(0, -1)]
  return Object.entries(obj).flatMap(([k, v]) => flatten(v, `${prefix}${k}.`))
}

const loadBundle = (lang: string, ns: string): Json =>
  JSON.parse(readFileSync(join(LOCALES_DIR, lang, `${ns}.json`), 'utf8'))

const listNamespaces = (lang: string): string[] =>
  readdirSync(join(LOCALES_DIR, lang))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))

// Capture t('…') call sites. Three forms supported:
//   t('ns:path.key')                → ns from prefix
//   t('path.key', { ns: 'ns' })     → ns from options
//   t('path.key')                    → resolved from useTranslation binding, else 'common'
const T_CALL = /\bt\(\s*['"]([^'"]+?)['"](?:\s*,\s*\{[^}]*ns:\s*['"]([^'"]+?)['"][^}]*\})?/g

// Detect useTranslation namespace binding in the file:
//   useTranslation('ns')             → single namespace
//   useTranslation(['ns1', 'ns2'])   → array; first element is the primary binding
//
// When a file uses a bound namespace, plain t('key') calls resolve to that namespace.
// This avoids false-positive "unresolved" errors for all the properties/modals/toolbar
// components that do const { t } = useTranslation('properties').
const USE_TRANSLATION_SINGLE = /useTranslation\(\s*['"]([^'"]+?)['"]\s*\)/g
const USE_TRANSLATION_ARRAY = /useTranslation\(\s*\[\s*['"]([^'"]+?)['"]/g

const getFileDefaultNs = (src: string): string => {
  const singleMatch = USE_TRANSLATION_SINGLE.exec(src)
  USE_TRANSLATION_SINGLE.lastIndex = 0
  if (singleMatch) return singleMatch[1]!
  const arrayMatch = USE_TRANSLATION_ARRAY.exec(src)
  USE_TRANSLATION_ARRAY.lastIndex = 0
  if (arrayMatch) return arrayMatch[1]!
  return 'common'
}

const collectCallSites = (): Set<string> => {
  const keys = new Set<string>()
  for (const file of globSync(SRC_GLOB, { ignore: ['**/*.test.*', 'src/legacy/**'] })) {
    const src = readFileSync(file, 'utf8')
    const fileDefaultNs = getFileDefaultNs(src)
    for (const m of src.matchAll(T_CALL)) {
      const raw = m[1]!
      const nsFromOpt = m[2]
      if (raw.includes(':')) keys.add(raw)
      else if (nsFromOpt) keys.add(`${nsFromOpt}:${raw}`)
      else keys.add(`${fileDefaultNs}:${raw}`)
    }
  }
  return keys
}

const problems: string[] = []
const warnings: string[] = []

// Step 1: parity check
const namespaces = listNamespaces('en')
for (const ns of namespaces) {
  const en = new Set(flatten(loadBundle('en', ns)))
  const it = new Set(flatten(loadBundle('it', ns)))
  for (const k of en) if (!it.has(k)) problems.push(`IT missing key: ${ns}:${k}`)
  for (const k of it) if (!en.has(k)) problems.push(`EN missing key: ${ns}:${k}`)
}

// Step 2: orphan / unresolved-call check
const bundleKeys = new Set<string>()
for (const ns of namespaces) {
  for (const k of flatten(loadBundle('en', ns))) bundleKeys.add(`${ns}:${k}`)
}
const calls = collectCallSites()

for (const c of calls) {
  if (!bundleKeys.has(c)) problems.push(`Unresolved t() call: ${c}`)
}
const orphans = [...bundleKeys].filter((k) => !calls.has(k))
if (orphans.length > 0) {
  warnings.push(`${orphans.length} orphan key(s) — sample: ${orphans.slice(0, 5).join(', ')}`)
}

console.log(
  `Locale linter: ${namespaces.length} namespace(s), ${bundleKeys.size} key(s), ${calls.size} call site(s).`,
)
for (const w of warnings) console.warn(`Warning: ${w}`)
if (problems.length > 0) {
  for (const p of problems) console.error(p)
  process.exit(1)
}
process.exit(0)
