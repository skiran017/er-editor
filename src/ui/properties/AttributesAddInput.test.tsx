import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttributesAddInput } from './AttributesAddInput'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

// Minimal no-op props satisfying AttributesAddInputProps
const defaultProps = {
  focusClass: 'focus:border-blue-500',
  buttonClass: 'bg-blue-600',
  onAdd: () => undefined,
}

beforeEach(() => { useUiStore.setState({ readonly: false }) })
afterEach(() => { useUiStore.setState({ readonly: false }) })

describe('AttributesAddInput — readonly mode', () => {
  it('renders nothing when uiStore.readonly is true', () => {
    useUiStore.setState({ readonly: true })
    const { container } = render(<AttributesAddInput {...defaultProps} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the input + add button when readonly is false', () => {
    const { container } = render(<AttributesAddInput {...defaultProps} />)
    expect(container.firstChild).not.toBeNull()
    // Name input visible
    expect(screen.getByRole('textbox', { name: 'New attribute name' })).toBeInTheDocument()
    // Add button visible
    expect(screen.getByRole('button', { name: 'Add attribute' })).toBeInTheDocument()
  })
})
