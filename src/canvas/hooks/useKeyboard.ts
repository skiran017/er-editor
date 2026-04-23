import { useEffect } from 'react'
import { matchKeybinding } from '@/interaction/keybindings'
import { useInteractionStore } from '@/interaction/interactionStore'

const TEXT_FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const isInTextField = (): boolean => {
  const el = document.activeElement
  if (!el) return false
  if (el instanceof HTMLElement && el.isContentEditable) return true
  return TEXT_FIELD_TAGS.has(el.tagName)
}

export const useKeyboard = (): void => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const binding = matchKeybinding(event)
      if (!binding) return
      // Skip the text-field check ONLY for bindings explicitly marked 'always'
      // (e.g. the cheatsheet toggle). 'hasSelection' bindings used to fall
      // through this filter, causing Delete/Backspace to delete the selected
      // node while the user was typing in the property panel (Bug 2).
      if (binding.when !== 'always' && isInTextField()) return
      event.preventDefault()
      useInteractionStore.getState().send(binding.event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
