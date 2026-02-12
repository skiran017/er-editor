import type { Entity, Relationship, Attribute, Connection, Diagram, ValidationError, Generalization } from '../types';

/**
 * Validation library for ER diagram elements
 * Matches Java app validation behavior
 */

/**
 * Helper: Check if entity is a child in an ISA (generalization) hierarchy
 */
function isISAChild(entityId: string, diagram: Diagram): boolean {
  return (diagram.generalizations ?? []).some(gen => gen.childIds.includes(entityId));
}

/**
 * Validate an entity and return warning messages
 * @param entity - Entity to validate
 * @param diagram - Diagram context
 */
export function validateEntity(entity: Entity, diagram: Diagram): string[] {
  const warnings: string[] = [];

  const isChild = isISAChild(entity.id, diagram);

  // Rule: Entity must have at least one attribute
  // Exception: ISA children inherit attributes from parent, so they're valid with zero own attributes
  if (entity.attributes.length === 0 && !isChild) {
    warnings.push('Entity must have at least one attribute');
  }

  // Rule: Regular entities must have at least one key attribute
  // Exception: ISA children inherit the parent's key, so they don't need their own
  // Weak entities don't need regular keys (they use discriminants)
  if (!entity.isWeak && !isChild) {
    const hasKeyAttribute = entity.attributes.some(attr => attr.isKey);
    if (!hasKeyAttribute) {
      warnings.push('Entity must have at least one key attribute');
    }
  }

  // Rule: Weak entities must have a discriminant attribute
  if (entity.isWeak) {
    const hasDiscriminant = entity.attributes.some(attr => attr.isDiscriminant);
    if (!hasDiscriminant) {
      warnings.push('Weak entity must have a discriminant attribute');
    }

    // Rule (Bug 10): Weak entity cannot be on 1-side of identifying relationship
    // Check all connections where this weak entity is involved
    const connections = diagram.connections.filter(conn =>
      conn.fromId === entity.id || conn.toId === entity.id
    );

    for (const conn of connections) {
      // Find the relationship
      const relId = conn.fromId === entity.id ? conn.toId : conn.fromId;
      const rel = diagram.relationships.find(r => r.id === relId);

      if (rel && rel.isWeak) {
        // This is an identifying relationship - check if weak entity is on 1-side
        // The weak entity should be on the N-side
        const entityIsFrom = conn.fromId === entity.id;
        const cardinality = conn.cardinality?.trim() || '';

        // Check if weak entity is on the 1-side
        // From entity perspective: if cardinality is "1" or "1:N" and entity is on the from side
        // To entity perspective: if cardinality is "N:1" and entity is on the to side
        if (
          (entityIsFrom && cardinality === '1') ||
          (!entityIsFrom && cardinality === '1')
        ) {
          warnings.push('Weak entity cannot be on 1-side of identifying relationship (must be on N-side)');
          break;
        }
      }
    }
  }

  return warnings;
}

/**
 * Validate a relationship and return warning messages
 */
export function validateRelationship(relationship: Relationship, diagram: Diagram): string[] {
  const warnings: string[] = [];

  // Rule: Relationship must connect at least 2 entities
  if (relationship.entityIds.length < 2) {
    warnings.push('Relationship must connect at least 2 entities');
  }

  // Rule: All connections must have cardinality defined
  const connections = diagram.connections.filter(conn =>
    conn.fromId === relationship.id || conn.toId === relationship.id
  );

  // Check that each entity has a connection
  for (const entityId of relationship.entityIds) {
    const hasConnection = connections.some(conn =>
      (conn.fromId === relationship.id && conn.toId === entityId) ||
      (conn.toId === relationship.id && conn.fromId === entityId)
    );
    if (!hasConnection) {
      warnings.push(`Relationship must have a connection to entity ${entityId}`);
    }
  }

  // Rule: All connections must have cardinality defined
  for (const connection of connections) {
    if (!connection.cardinality || connection.cardinality.trim() === '') {
      warnings.push('All connections must have cardinality defined');
      break;
    }
  }

  // Rule: All connections must have participation defined
  for (const connection of connections) {
    if (!connection.participation || (connection.participation !== 'partial' && connection.participation !== 'total')) {
      warnings.push('All connections must have participation defined');
      break;
    }
  }

  // Rule: Identifying (weak) relationship must connect at least one weak entity
  if (relationship.isWeak && relationship.entityIds.length > 0) {
    const connectedEntities = relationship.entityIds
      .map((entityId) => diagram.entities.find((e) => e.id === entityId))
      .filter(Boolean) as Entity[];
    const hasWeakEntity = connectedEntities.some((e) => e.isWeak);
    if (!hasWeakEntity) {
      warnings.push('Identifying relationship must connect at least one weak entity');
    }
  }

  return warnings;
}

/**
 * Validate an attribute and return warning messages
 */
export function validateAttribute(attribute: Attribute, diagram: Diagram): string[] {
  const warnings: string[] = [];

  // Rule: Attribute must connect to exactly one entity OR one relationship (XOR)
  const hasEntity = !!attribute.entityId;
  const hasRelationship = !!attribute.relationshipId;

  if (!hasEntity && !hasRelationship) {
    warnings.push('Attribute must connect to exactly one entity or relationship');
  } else if (hasEntity && hasRelationship) {
    warnings.push('Attribute cannot connect to both entity and relationship');
  }

  // Rule: Cannot be both key and derived
  if (attribute.isKey && attribute.isDerived) {
    warnings.push('Attribute cannot be both key and derived');
  }

  // Rule (Bug 11): Key attribute cannot be multivalued
  // A key must uniquely identify an entity instance - multivalued attributes cannot serve as keys
  if (attribute.isKey && attribute.isMultivalued) {
    warnings.push('Key attribute cannot be multivalued (must be single-valued)');
  }

  // Rule: Discriminant cannot be multivalued (same reasoning as key)
  if (attribute.isDiscriminant && attribute.isMultivalued) {
    warnings.push('Discriminant cannot be multivalued (must be single-valued)');
  }

  // Rule: Relationship attributes cannot be key attributes
  // Relationships don't have primary keys in Chen notation
  if (attribute.isKey && attribute.relationshipId) {
    warnings.push('Relationship attributes cannot be key attributes');
  }

  // Rule: Discriminant only valid for weak entity attributes
  if (attribute.isDiscriminant) {
    if (attribute.relationshipId) {
      warnings.push('Discriminant cannot be used for relationship attributes');
    } else if (attribute.entityId) {
      const parentEntity = diagram.entities.find(e => e.id === attribute.entityId);
      if (parentEntity && !parentEntity.isWeak) {
        warnings.push('Discriminant only valid for weak entity attributes');
      }
    }
  }

  return warnings;
}

/**
 * Validate a connection and return warning messages
 */
export function validateConnection(connection: Connection, diagram: Diagram): string[] {
  const warnings: string[] = [];

  // Rule: Must connect valid elements
  const fromElement = diagram.entities.find(e => e.id === connection.fromId) ||
    diagram.relationships.find(r => r.id === connection.fromId);
  const toElement = diagram.entities.find(e => e.id === connection.toId) ||
    diagram.relationships.find(r => r.id === connection.toId);

  if (!fromElement) {
    warnings.push('Connection source element does not exist');
  }
  if (!toElement) {
    warnings.push('Connection target element does not exist');
  }

  // Rule: Cardinality must be valid format
  if (connection.cardinality) {
    const validCardinalities = ['1', 'N', '1:N', 'N:1', '1:1', 'N:N', 'M:N'];
    if (!validCardinalities.includes(connection.cardinality.trim())) {
      warnings.push('Cardinality must be valid format (1, N, or 1:N)');
    }
  }

  // Rule: Participation must be "partial" or "total"
  if (connection.participation &&
    connection.participation !== 'partial' &&
    connection.participation !== 'total') {
    warnings.push('Participation must be "partial" or "total"');
  }

  return warnings;
}

/**
 * Validate a generalization and return warning messages
 */
export function validateGeneralization(gen: Generalization, diagram: Diagram): string[] {
  const warnings: string[] = [];

  const parent = diagram.entities.find(e => e.id === gen.parentId);
  if (!parent) {
    warnings.push('Generalization parent entity does not exist');
  }

  if (gen.childIds.length === 0) {
    warnings.push('Generalization must have at least one child');
  }

  if (gen.childIds.includes(gen.parentId)) {
    warnings.push('Parent cannot be a child of its own generalization');
  }

  for (const childId of gen.childIds) {
    const child = diagram.entities.find(e => e.id === childId);
    if (!child) {
      warnings.push(`Child entity ${childId} does not exist`);
    }
  }

  return warnings;
}

/**
 * Validate entire diagram and return all validation errors
 */
export function validateDiagram(diagram: Diagram): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate all entities
  for (const entity of diagram.entities) {
    const warnings = validateEntity(entity, diagram);
    if (warnings.length > 0) {
      errors.push({
        elementId: entity.id,
        message: warnings.join('; '),
        severity: 'warning'
      });
    }
  }

  // Validate all relationships
  for (const relationship of diagram.relationships) {
    const warnings = validateRelationship(relationship, diagram);
    if (warnings.length > 0) {
      errors.push({
        elementId: relationship.id,
        message: warnings.join('; '),
        severity: 'warning'
      });
    }
  }

  // Validate all attributes
  for (const attribute of diagram.attributes) {
    const warnings = validateAttribute(attribute, diagram);
    if (warnings.length > 0) {
      errors.push({
        elementId: attribute.id,
        message: warnings.join('; '),
        severity: 'warning'
      });
    }
  }

  // Validate all generalizations
  for (const gen of diagram.generalizations ?? []) {
    const warnings = validateGeneralization(gen, diagram);
    if (warnings.length > 0) {
      errors.push({
        elementId: gen.id,
        message: warnings.join('; '),
        severity: 'warning'
      });
    }
  }

  // Validate all connections
  for (const connection of diagram.connections) {
    const warnings = validateConnection(connection, diagram);
    if (warnings.length > 0) {
      errors.push({
        elementId: connection.id,
        message: warnings.join('; '),
        severity: 'warning'
      });
    }
  }

  return errors;
}

/**
 * Check if an entity name is valid (non-empty after trim)
 */
export function isValidEntityName(name: string): boolean {
  return name.trim().length > 0;
}

/**
 * Check if an entity name is unique (excluding the current entity)
 */
export function checkUniqueEntityName(
  currentEntityId: string,
  name: string,
  diagram: Diagram
): boolean {
  const trimmedName = name.trim();
  if (!trimmedName) return true; // Empty names are handled elsewhere

  return !diagram.entities.some(
    (entity) => entity.id !== currentEntityId && entity.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
}

/**
 * Check if a relationship name is unique (excluding the current relationship)
 */
export function checkUniqueRelationshipName(
  currentRelationshipId: string,
  name: string,
  diagram: Diagram
): boolean {
  const trimmedName = name.trim();
  if (!trimmedName) return true; // Empty names are handled elsewhere

  return !diagram.relationships.some(
    (relationship) =>
      relationship.id !== currentRelationshipId &&
      relationship.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
}

/**
 * Check if an attribute name is unique within its parent (entity or relationship)
 * Attributes can have the same name if they belong to different parents
 */
export function checkUniqueAttributeName(
  currentAttributeId: string,
  name: string,
  parentEntityId: string | undefined,
  parentRelationshipId: string | undefined,
  diagram: Diagram
): boolean {
  const trimmedName = name.trim();
  if (!trimmedName) return true; // Empty names are handled elsewhere

  // Check attributes of the same parent
  if (parentEntityId) {
    return !diagram.attributes.some(
      (attr) =>
        attr.id !== currentAttributeId &&
        attr.entityId === parentEntityId &&
        attr.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
  }

  if (parentRelationshipId) {
    return !diagram.attributes.some(
      (attr) =>
        attr.id !== currentAttributeId &&
        attr.relationshipId === parentRelationshipId &&
        attr.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
  }

  return true; // No parent, can't check uniqueness
}
