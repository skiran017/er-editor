import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDiagramStore } from '@/state/diagramStore'
import { newNodeId, newEdgeId } from '@/domain/id'
import { findNonOverlappingOrigin, bboxFromNodeLike } from '@/domain/geometry'
import type {
  AttributeNode,
  BBox,
  NodeId,
  Point,
  Size,
} from '@/domain/types'
import { AttributeRow } from './AttributeRow'
import { AttributesAddInput } from './AttributesAddInput'

// Past this many rows we collapse the list behind a Show more / Show less
// toggle so the panel doesn't grow unbounded.
const COLLAPSE_THRESHOLD = 5
const NEW_ATTR_SIZE: Size = { width: 90, height: 50 }

export interface AttributesEditorProps {
  readonly parentId: NodeId
  // Accent used by the "Add attribute" button — ports the legacy per-kind
  // colour (blue under Entity, purple under Relationship).
  readonly accent: 'blue' | 'purple'
}

const ACCENT_BUTTON: Record<AttributesEditorProps['accent'], string> = {
  blue: 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400',
  purple: 'bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400',
}

const ACCENT_FOCUS: Record<AttributesEditorProps['accent'], string> = {
  blue: 'focus:border-blue-500',
  purple: 'focus:border-purple-500',
}

// Pick a default origin for a new attribute: outside the parent, to the right
// by default. Spiral search then pushes it further if the spot's occupied.
const chooseOrigin = (
  parent: { position: Point; size: Size },
  index: number,
  obstacles: readonly BBox[],
): Point => {
  const gap = 40
  const step = 14
  const cx = parent.position.x + parent.size.width / 2
  const cy = parent.position.y + parent.size.height / 2
  const diag = Math.hypot(parent.size.width, parent.size.height) / 2
  const dist = diag + gap + index * step
  const desired: Point = {
    x: cx + dist - NEW_ATTR_SIZE.width / 2,
    y: cy - NEW_ATTR_SIZE.height / 2,
  }
  return findNonOverlappingOrigin(desired, NEW_ATTR_SIZE, obstacles)
}

/**
 * Inline attribute editor shown under an Entity or Relationship panel. Lists
 * every attribute hanging off the selected parent (followed via `attribute-of`
 * edges), with a "Show more" toggle past 5 rows and an "Add attribute" input
 * at the bottom.
 *
 * Rationale: legacy packed every attribute into a single pane so you never
 * navigate away to edit. Our attributes are first-class nodes, so we follow
 * the edges to reproduce the same UX without changing the data model.
 */
export const AttributesEditor = ({ parentId, accent }: AttributesEditorProps) => {
  const { t } = useTranslation('properties')
  const diagram = useDiagramStore((s) => s.diagram)
  const applyPatch = useDiagramStore((s) => s.applyPatch)

  const attributes = useMemo<readonly AttributeNode[]>(() => {
    const out: AttributeNode[] = []
    for (const eid of diagram.edgeOrder) {
      const edge = diagram.edgesById[eid]
      if (!edge || edge.kind !== 'attribute-of') continue
      if (edge.targetId !== parentId) continue
      const attr = diagram.nodesById[edge.sourceId]
      if (attr && attr.kind === 'attribute') out.push(attr)
    }
    return out
  }, [diagram, parentId])

  const [expanded, setExpanded] = useState(false)
  const showAll = expanded || attributes.length <= COLLAPSE_THRESHOLD
  const visible = showAll ? attributes : attributes.slice(0, COLLAPSE_THRESHOLD)
  const hiddenCount = attributes.length - visible.length

  const handleAdd = (name: string): void => {
    const parent = diagram.nodesById[parentId]
    if (!parent || (parent.kind !== 'entity' && parent.kind !== 'relationship')) return
    const obstacles: BBox[] = diagram.nodeOrder.map((id) => bboxFromNodeLike(diagram.nodesById[id]))
    const position = chooseOrigin(parent, attributes.length, obstacles)

    const attrId = newNodeId()
    const edgeId = newEdgeId()
    // Atomic applyPatch — invariant subscriber (bootstrap.ts) never sees a
    // transient state where the new attribute lacks its attribute-of edge.
    applyPatch({
      addNodes: [{
        id: attrId, kind: 'attribute', name,
        isKey: false, isDiscriminant: false, isMultivalued: false,
        isDerived: false, isComposite: false,
        position, size: NEW_ATTR_SIZE,
      }],
      addEdges: [{
        id: edgeId, kind: 'attribute-of',
        sourceId: attrId, targetId: parentId, waypoints: [],
      }],
    })
  }

  return (
    <section
      className="flex flex-col gap-2 border-t border-slate-200 p-3 dark:border-slate-700"
      data-role="attributes-editor"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('attr.section')}
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t('attr.count', { count: attributes.length })}
        </span>
      </div>

      {attributes.length === 0 ? (
        <p className="text-xs italic text-slate-400 dark:text-slate-500">{t('attr.none')}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {visible.map((attr) => <AttributeRow key={attr.id} attribute={attr} />)}
          </div>
          {attributes.length > COLLAPSE_THRESHOLD && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="self-start text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              data-role="attributes-toggle"
            >
              {expanded ? t('attr.showLess') : t('attr.showMore', { count: hiddenCount })}
            </button>
          )}
        </>
      )}

      <AttributesAddInput
        focusClass={ACCENT_FOCUS[accent]}
        buttonClass={ACCENT_BUTTON[accent]}
        onAdd={handleAdd}
      />
    </section>
  )
}
