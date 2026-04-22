import type { Diagram, NodeId, EdgeId } from '@/domain/types'

export type ValidationSeverity = 'error' | 'warning'

export type ValidationCategory =
  | 'entity'
  | 'relationship'
  | 'attribute'
  | 'generalization'
  | 'structural'

export interface ValidationError {
  readonly ruleId: string
  readonly severity: ValidationSeverity
  readonly targetId: NodeId | EdgeId
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string>>
}

export interface ValidationRule {
  readonly id: string
  readonly severity: ValidationSeverity
  readonly category: ValidationCategory
  readonly check: (diagram: Diagram) => readonly ValidationError[]
}
