import { nanoid } from 'nanoid'
import type { NodeId, EdgeId } from './types'

export const ID_LENGTH = 10

export const newNodeId = (): NodeId => nanoid(ID_LENGTH) as NodeId
export const newEdgeId = (): EdgeId => nanoid(ID_LENGTH) as EdgeId

export const asNodeId = (raw: string): NodeId => raw as NodeId
export const asEdgeId = (raw: string): EdgeId => raw as EdgeId
