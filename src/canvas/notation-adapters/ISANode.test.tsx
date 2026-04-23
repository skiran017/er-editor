import type { ReactElement } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react'
import { ISANode } from './ISANode'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { useUiStore } from '@/state/uiStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram, type NodeId } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type ISARfNode = Node<NotationNodeData, 'isa'>

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(),
    selectedEdgeIds: new Set(),
    rubberband: null,
  })
  useValidationStore.setState({ errorsById: {}, enabled: true })
  useUiStore.getState().closeContextMenu()
}

const mkNodeProps = (id: NodeId) =>
  ({ id, data: { nodeId: id }, type: 'isa' }) as unknown as NodeProps<ISARfNode>

const renderWithProvider = (ui: ReactElement) =>
  render(
    <ReactFlowProvider>
      <svg>{ui}</svg>
    </ReactFlowProvider>,
  )

describe('ISANode container', () => {
  beforeEach(resetStores)

  it('renders a total generalization with a single triangle glyph (the total marker lives on the parent edge now, not inside the glyph)', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'isa',
      isTotal: true,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
    })
    const { container } = renderWithProvider(<ISANode {...mkNodeProps(id)} />)
    expect(container.querySelectorAll('polygon').length).toBe(1)
    // "ISA" label is present regardless of totality.
    expect(container.querySelector('text')?.textContent).toBe('ISA')
  })

  it('renders a partial generalization with single triangle', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'isa',
      isTotal: false,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
    })
    const { container } = renderWithProvider(<ISANode {...mkNodeProps(id)} />)
    expect(container.querySelectorAll('polygon').length).toBe(1)
  })

  it('returns null when the stored node is not an isa', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'X',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const { container } = renderWithProvider(<ISANode {...mkNodeProps(id)} />)
    expect(container.querySelector('[data-kind="isa"]')).not.toBeInTheDocument()
  })

  it('right-click on ISA opens context menu with "Add child entity"', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'isa',
      isTotal: false,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
    })
    const { container } = renderWithProvider(<ISANode {...mkNodeProps(id)} />)
    // The outer <svg> wrapping <ISANode /> is the render provider's <svg>; the
    // component's own <svg> is a descendant (nested svg). Grab the inner one.
    const svgs = container.querySelectorAll('svg')
    const inner = svgs[svgs.length - 1] as SVGSVGElement
    inner.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 50, clientY: 50,
    }))
    const cm = useUiStore.getState().contextMenu
    expect(cm).not.toBeNull()
    expect(cm?.items).toHaveLength(1)
    expect(cm?.items[0]?.id).toBe('add-child')
    expect(cm?.items[0]?.labelKey).toBe('menu:isa.addChild')
    expect(cm?.at).toEqual({ x: 50, y: 50 })
  })

  it('selecting the "Add child entity" item sends CONNECT_CHILD_TO_ISA to the FSM', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'isa',
      isTotal: false,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
    })
    const { container } = renderWithProvider(<ISANode {...mkNodeProps(id)} />)
    const svgs = container.querySelectorAll('svg')
    const inner = svgs[svgs.length - 1] as SVGSVGElement
    inner.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 10, clientY: 10,
    }))
    const cm = useUiStore.getState().contextMenu
    cm?.items[0]?.onSelect()
    // The FSM is now in connectToGeneralization.waitingForChild
    const snap = useInteractionStore.getState().snapshot
    expect(snap.matches({ connectToGeneralization: 'waitingForChild' })).toBe(true)
    // Clean up: cancel so other tests don't observe leftover FSM state.
    useInteractionStore.getState().send({ type: 'CANCEL' })
  })
})
