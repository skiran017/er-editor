import { describe, it, expect, expectTypeOf } from 'vitest'
import type {
  NotationPlugin,
  Codec,
  ParseResult,
  ToolbarConfig,
  NotationDefaults,
  NotationNodeData,
  NotationEdgeData,
  ValidationRule,
} from './types'
import type { Diagram, NodeId, EdgeId } from '@/domain/types'

describe('notation/types contract', () => {
  it('NotationPlugin shape is assignable from a well-formed literal', () => {
    const plugin: NotationPlugin = {
      id: 'test',
      label: 'Test',
      nodeTypes: {} as NotationPlugin['nodeTypes'],
      edgeTypes: {} as NotationPlugin['edgeTypes'],
      tools: { groups: [] },
      defaults: {
        entitySize: { width: 120, height: 60 },
        relationshipSize: { width: 140, height: 70 },
        attributeSize: { width: 90, height: 50 },
        isaSize: { width: 100, height: 60 },
        edgeType: 'smoothstep',
      },
      validate: (_d: Diagram) => ({}),
      codecs: {
        nativeJson: {
          id: 'test-native-json',
          label: 'Test JSON',
          mimeType: 'application/json',
          fileExtension: 'json',
          role: 'import-export',
        },
      },
    }
    expectTypeOf(plugin).toMatchTypeOf<NotationPlugin>()
  })

  it('ParseResult is a discriminated union on ok', () => {
    const ok: ParseResult = { ok: true, diagram: {} as Diagram, warnings: [] }
    const err: ParseResult = { ok: false, errors: [{ code: 'bad-xml', message: 'malformed input' }] }
    expect(ok.ok).toBe(true)
    expect(err.ok).toBe(false)
  })

  it('NotationNodeData / NotationEdgeData expose branded ids', () => {
    const nd: NotationNodeData = { nodeId: 'n' as NodeId }
    const ed: NotationEdgeData = { edgeId: 'e' as EdgeId }
    expect(nd.nodeId).toBeTruthy()
    expect(ed.edgeId).toBeTruthy()
  })

  it('surface types exist', () => {
    expectTypeOf<ToolbarConfig>().toHaveProperty('groups')
    expectTypeOf<NotationDefaults>().toHaveProperty('entitySize')
    expectTypeOf<ValidationRule>().toHaveProperty('check')
    expectTypeOf<Codec>().toHaveProperty('id')
  })
})
