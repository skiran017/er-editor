import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InlineRenameOverlay } from './InlineRenameOverlay'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { useViewportStore } from '@/state/viewportStore'
import { emptyDiagram } from '@/domain/types'

beforeEach(() => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useUiStore.setState({ inlineRename: null })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
})

describe('InlineRenameOverlay', () => {
  it('renders nothing when inlineRename is null', () => {
    const { container } = render(<InlineRenameOverlay />)
    expect(container.querySelector('[data-role="inline-rename"]')).toBeNull()
  })

  it('renders input with initial value when active', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Customer', isWeak: false,
      position: { x: 10, y: 20 }, size: { width: 120, height: 60 },
    })
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Customer' })
    render(<InlineRenameOverlay />)
    expect(screen.getByDisplayValue('Customer')).toBeInTheDocument()
  })

  it('Enter commits — new value written to store and state cleared', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Old', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Old' })
    render(<InlineRenameOverlay />)
    const input = screen.getByDisplayValue('Old') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const node = useDiagramStore.getState().diagram.nodesById[id]
    expect(node && 'name' in node ? node.name : null).toBe('New Name')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('Escape cancels — store untouched and state cleared', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Keep', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Keep' })
    render(<InlineRenameOverlay />)
    const input = screen.getByDisplayValue('Keep') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    const node = useDiagramStore.getState().diagram.nodesById[id]
    expect(node && 'name' in node ? node.name : null).toBe('Keep')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })
})
