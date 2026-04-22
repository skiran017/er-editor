import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextInput } from './TextInput'

describe('TextInput', () => {
  it('renders label and input together', () => {
    render(<TextInput label="Name" name="name" />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('fires onChange when the user types', async () => {
    const onChange = vi.fn()
    render(<TextInput label="Name" name="name" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'ab')
    expect(onChange).toHaveBeenCalled()
  })

  it('reflects controlled value', () => {
    render(
      <TextInput
        label="Name"
        name="name"
        value="hello"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('sm size applies h-7', () => {
    render(<TextInput label="Small" size="sm" />)
    expect(screen.getByRole('textbox').className).toContain('h-7')
  })
})
