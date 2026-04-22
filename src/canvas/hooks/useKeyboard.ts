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
      if (binding.when === 'notInTextField' && isInTextField()) return
      // 'always' bindings skip the text-field check; 'hasSelection' is evaluated in actions.
      event.preventDefault()
      useInteractionStore.getState().send(binding.event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
