import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyPanel } from './EmptyPanel'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

describe('EmptyPanel', () => {
  it('renders the "select a node or edge" text', () => {
    render(<EmptyPanel />)
    expect(screen.getByText(/select a node or edge/i)).toBeInTheDocument()
  })
})
