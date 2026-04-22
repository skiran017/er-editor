import type { Diagram, ValidationSeverity, ValidationError } from '@/domain/types'

export type { ValidationSeverity, ValidationError } from '@/domain/types'

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
