import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => {
  await initI18n()
})

describe('App', () => {
  it('mounts menu, toolbar, canvas; property panel is hidden until something is selected', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('menubar')).toBeInTheDocument()
    expect(container.querySelector('[data-role="toolbar"]')).toBeInTheDocument()
    expect(container.querySelector('.react-flow')).toBeInTheDocument()
    // With no selection the properties aside collapses away entirely.
    expect(container.querySelector('[data-role="properties-panel"]')).not.toBeInTheDocument()
  })

  it('opens the File menu when clicking the File button', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('menuitem', { name: 'File' }))
    expect(screen.getByRole('menuitem', { name: /New diagram/ })).toBeInTheDocument()
  })
})
