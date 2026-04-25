import { useUiStore } from '@/state/uiStore'
import { parseQueryParams } from './queryParams'

/**
 * Reads `?readonly` and `?embed` from the URL and writes them to
 * `uiStore.readonly` / `uiStore.embed`. Called once from `main.tsx` at
 * boot. Both flags are transient (not persisted) so the URL is always
 * the source of truth — an empty query clears them on next reload.
 */
export const applyModeFromUrl = (search: string): void => {
  const { readonly, embed } = parseQueryParams(search)
  const store = useUiStore.getState()
  store.setReadonly(readonly)
  store.setEmbed(embed)
}
