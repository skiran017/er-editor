import type { Entity, Relationship, Attribute, Connection, Diagram, ValidationError } from '../types';

/**
 * Validation library for ER diagram elements
 * Matches Java app validation behavior
 */

/**
 * Validate an entity and return warning messages
 */
export function validateEntity(entity: Entity, diagram: Diagram): string[] {
  const warnings: string[] = [];

  // Rule: Entity must have at least one attribute
  if (entity.attributes.length === 0) {
    warnings.push('Entity must have at least one attribute');
  }

  // Rule: Entity must have at least one key attribute
  const hasKeyAttribute = entity.attributes.some(attr => attr.isKey);
  if (!hasKeyAttribute) {
    warnings.push('Entity must have at least one key attribute');
  }

  // Rule: Weak entities must have a discriminant attribute
  if (entity.isWeak) {
    const hasDiscriminant = entity.attributes.some(attr => attr.isPartialKey);
    if (!hasDiscriminant) {
      warnings.push('Weak entity must have a discriminant attribute');
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

  // Rule: Partial key only valid for weak entity attributes
  if (attribute.isPartialKey && attribute.entityId) {
    const parentEntity = diagram.entities.find(e => e.id === attribute.entityId);
    if (parentEntity && !parentEntity.isWeak) {
      warnings.push('Partial key only valid for weak entity attributes');
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

