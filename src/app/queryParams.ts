import type { Language } from '@/state/uiStore'

export interface QueryParams {
  readonly lang: Language | null
  readonly validation: 'on' | 'off' | null
  readonly readonly: boolean
  readonly embed: boolean
  readonly examMode: boolean
}

const LANGS = new Set<Language>(['en', 'it'])

const parseLang = (raw: string | null): Language | null => {
  const norm = raw?.toLowerCase() ?? null
  return norm && LANGS.has(norm as Language) ? (norm as Language) : null
}

const parseValidation = (raw: string | null): 'on' | 'off' | null => {
  const norm = raw?.toLowerCase()
  return norm === 'on' || norm === 'off' ? norm : null
}

const parseBool = (raw: string | null): boolean => raw?.toLowerCase() === 'true'

const resolveExamMode = (p: URLSearchParams): boolean => {
  const raw = p.get('examMode')?.toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return p.get('embed')?.toLowerCase() === 'true'
}

export const parseQueryParams = (search: string): QueryParams => {
  const p = new URLSearchParams(search)
  return {
    lang: parseLang(p.get('lang')),
    validation: parseValidation(p.get('validation')),
    readonly: parseBool(p.get('readonly')),
    embed: parseBool(p.get('embed')),
    examMode: resolveExamMode(p),
  }
}
