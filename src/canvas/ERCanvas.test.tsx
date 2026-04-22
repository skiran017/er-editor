import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ERCanvas } from './ERCanvas'

describe('ERCanvas', () => {
  it('mounts and renders a React Flow container', () => {
    const { container } = render(<ERCanvas />)
    const rf = container.querySelector('.react-flow')
    expect(rf).toBeInTheDocument()
  })

  it('renders React Flow controls (zoom in/out/fit-view)', () => {
    render(<ERCanvas />)
    expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fit view/i)).toBeInTheDocument()
  })
})
