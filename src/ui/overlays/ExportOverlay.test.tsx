import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExportOverlay } from './ExportOverlay'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

beforeEach(() => { useUiStore.setState({ exporting: false }) })

describe('ExportOverlay', () => {
  it('renders nothing while uiStore.exporting is false', () => {
    const { container } = render(<ExportOverlay />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a status overlay when uiStore.exporting flips to true', () => {
    useUiStore.setState({ exporting: true })
    render(<ExportOverlay />)
    const overlay = screen.getByRole('status')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute('data-role', 'export-overlay')
  })
})
