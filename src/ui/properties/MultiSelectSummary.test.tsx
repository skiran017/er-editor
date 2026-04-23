import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultiSelectSummary } from './MultiSelectSummary'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

describe('MultiSelectSummary', () => {
  it('shows "{count} items selected"', () => {
    render(<MultiSelectSummary count={3} />)
    expect(screen.getByText('3 items selected')).toBeInTheDocument()
  })
})
