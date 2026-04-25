import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageToggle } from './LanguageToggle'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

describe('LanguageToggle', () => {
  it('renders two buttons labelled EN and IT with the active one pressed', () => {
    render(<LanguageToggle value="en" onChange={() => {}} />)

    const en = screen.getByRole('radio', { name: /english/i })
    const it = screen.getByRole('radio', { name: /italian/i })
    expect(en).toHaveAttribute('aria-checked', 'true')
    expect(it).toHaveAttribute('aria-checked', 'false')
  })

  it('marks IT as active when value is "it"', () => {
    render(<LanguageToggle value="it" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: /italian/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange("it") when IT is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LanguageToggle value="en" onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: /italian/i }))

    expect(onChange).toHaveBeenCalledWith('it')
  })

  it('does NOT call onChange when the already-active option is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LanguageToggle value="en" onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: /english/i }))

    expect(onChange).not.toHaveBeenCalled()
  })
})
