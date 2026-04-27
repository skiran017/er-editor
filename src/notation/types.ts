import type { ComponentType } from 'react'
import type { NodeProps, EdgeProps } from '@xyflow/react'
import type {
  Diagram,
  ValidationSeverity,
  ValidationError,
  NodeId,
  EdgeId,
  NodeKind,
  EdgeKind,
} from '@/domain/types'

export type { ValidationSeverity, ValidationError } from '@/domain/types'

// ——— Validation rule (unchanged from pre-Phase-4) ———

export type ValidationCategory =
  | 'entity'
  | 'relationship'
  | 'attribute'
  | 'generalization'
  | 'structural'

export interface ValidationRule {
  readonly id: string
  readonly severity: ValidationSeverity
  readonly category: ValidationCategory
  readonly check: (diagram: Diagram) => readonly ValidationError[]
}

// ——— Codec contract (minimal for Phase 4; Phase 5 wires parse/serialize) ———

export type ParseWarning = { readonly code: string; readonly message: string }
export type ParseError = { readonly code: string; readonly message: string }

export type ParseResult =
  | {
      readonly ok: true
      readonly diagram: Diagram
      readonly warnings: readonly ParseWarning[]
    }
  | {
      readonly ok: false
      readonly errors: readonly ParseError[]
    }

export interface Codec {
  readonly id: string
  readonly label: string
  readonly mimeType: string
  readonly fileExtension: string
  readonly role: 'import-export' | 'import-only' | 'export-only'
  readonly parse?: (input: string) => ParseResult
  readonly serialize?: (diagram: Diagram) => string
}

// ——— Toolbar config ———

export interface ToolbarGroup {
  readonly id: string
  readonly labelKey: string
  readonly tools: readonly string[]
}

export interface ToolbarConfig {
  readonly groups: readonly ToolbarGroup[]
}

// ——— Per-plugin defaults ———

export interface NotationDefaults {
  readonly entitySize: { readonly width: number; readonly height: number }
  readonly relationshipSize: { readonly width: number; readonly height: number }
  readonly attributeSize: { readonly width: number; readonly height: number }
  readonly isaSize: { readonly width: number; readonly height: number }
  readonly edgeType: 'smoothstep' | 'step' | 'straight'
}

// ——— React-Flow data payloads (shared by all plugins) ———

export type NotationNodeData = Record<string, unknown> & {
  readonly nodeId: NodeId
}

export type NotationEdgeData = Record<string, unknown> & {
  readonly edgeId: EdgeId
}

// ——— Plugin ———

// #region notation-plugin
export interface NotationPlugin {
  readonly id: string
  readonly label: string
  readonly nodeTypes: Record<NodeKind, ComponentType<NodeProps>>
  readonly edgeTypes: Record<EdgeKind, ComponentType<EdgeProps>>
  readonly tools: ToolbarConfig
  readonly defaults: NotationDefaults
  readonly validate: (diagram: Diagram) => Record<string, readonly ValidationError[]>
  readonly codecs: {
    readonly nativeJson: Codec
    readonly javaXml?: Codec
    readonly png?: Codec
    readonly svg?: Codec
    readonly mermaid?: Codec
  }
}
// #endregion
