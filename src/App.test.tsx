import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => {
  await initI18n()
})

describe('App', () => {
  it('mounts the hamburger menu button, toolbar, canvas; property panel is hidden until something is selected', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
    expect(container.querySelector('[data-role="toolbar"]')).toBeInTheDocument()
    expect(container.querySelector('.react-flow')).toBeInTheDocument()
    expect(container.querySelector('[data-role="properties-panel"]')).not.toBeInTheDocument()
  })

  it('clicking the hamburger opens the dropdown menu with file actions', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('menu', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Open/ })).toBeInTheDocument()
  })
})
