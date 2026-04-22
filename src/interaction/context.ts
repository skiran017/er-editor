import type { NodeId, Point } from '@/domain/types'
import type { Tool, ResizeHandle } from './events'

export interface EditorContext {
  readonly tool: Tool
  readonly draggedNodeId: NodeId | null
  readonly dragOriginPoint: Point | null
  readonly connectionFromId: NodeId | null
  readonly quickFirstId: NodeId | null
  readonly resizeNodeId: NodeId | null
  readonly resizeHandle: ResizeHandle | null
}

export const initialContext: EditorContext = Object.freeze({
  tool: 'select',
  draggedNodeId: null,
  dragOriginPoint: null,
  connectionFromId: null,
  quickFirstId: null,
  resizeNodeId: null,
  resizeHandle: null,
})
