import type { Diagram } from '@/domain/types'
import type { ValidationError, ValidationRule } from '@/notation/types'
import { entityRules } from './entity'
import { relationshipRules } from './relationship'
import { attributeRules } from './attribute'
import { generalizationRules } from './generalization'
import { structuralRules } from './structural'

export const chenRules: readonly ValidationRule[] = [
  ...entityRules,
  ...relationshipRules,
  ...attributeRules,
  ...generalizationRules,
  ...structuralRules,
] as const

export const validateChen = (diagram: Diagram): readonly ValidationError[] => {
  const errors: ValidationError[] = []
  for (const rule of chenRules) {
    for (const e of rule.check(diagram)) errors.push(e)
  }
  return errors
}

export {
  entityRules,
  relationshipRules,
  attributeRules,
  generalizationRules,
  structuralRules,
}
