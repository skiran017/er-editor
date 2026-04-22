import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { KeyboardShortcut } from './KeyboardShortcut'

describe('KeyboardShortcut', () => {
  it('renders the combo text inside a <kbd> element', () => {
    const { container } = render(<KeyboardShortcut combo="Ctrl+S" />)
    const kbd = container.querySelector('kbd')
    expect(kbd).not.toBeNull()
    expect(kbd?.tagName).toBe('KBD')
    expect(kbd?.textContent).toBe('Ctrl+S')
  })

  it('renders different combos verbatim', () => {
    const { container } = render(<KeyboardShortcut combo="Shift+Alt+P" />)
    expect(container.querySelector('kbd')?.textContent).toBe('Shift+Alt+P')
  })
})
