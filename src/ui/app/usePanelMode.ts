import { useEffect, useState } from 'react'

export type PanelMode = 'mobile' | 'tablet' | 'desktop'

const SM_QUERY = '(min-width: 640px)'   // Tailwind sm
const LG_QUERY = '(min-width: 1024px)'  // Tailwind lg

const compute = (sm: boolean, lg: boolean): PanelMode =>
  lg ? 'desktop' : sm ? 'tablet' : 'mobile'

const safeMatch = (query: string): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/**
 * Returns the active layout mode based on viewport width. Re-renders consumers
 * when the viewport crosses a Tailwind sm / lg threshold. AppShell uses this
 * to decide whether the property panel renders inline (desktop) or as a
 * drawer (mobile / tablet).
 */
export const usePanelMode = (): PanelMode => {
  const [mode, setMode] = useState<PanelMode>(() =>
    compute(safeMatch(SM_QUERY), safeMatch(LG_QUERY)),
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const sm = window.matchMedia(SM_QUERY)
    const lg = window.matchMedia(LG_QUERY)
    const update = () => setMode(compute(sm.matches, lg.matches))
    sm.addEventListener('change', update)
    lg.addEventListener('change', update)
    return () => {
      sm.removeEventListener('change', update)
      lg.removeEventListener('change', update)
    }
  }, [])
  return mode
}
