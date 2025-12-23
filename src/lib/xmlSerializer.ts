import type { Diagram, Entity, Relationship, Attribute, Connection, LineShape, ArrowShape } from '../types';

/**
 * Serialize Diagram object to XML string
 */
export function serializeDiagramToXML(diagram: Diagram): string {
  const xmlParts: string[] = [];

  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push('<ERDiagram version="1.0">');

  // Serialize entities
  diagram.entities.forEach((entity) => {
    xmlParts.push(serializeEntity(entity));
  });

  // Serialize relationships
  diagram.relationships.forEach((relationship) => {
    xmlParts.push(serializeRelationship(relationship));
  });

  // Serialize standalone attributes (canvas attributes)
  diagram.attributes.forEach((attribute) => {
    xmlParts.push(serializeAttribute(attribute));
  });

  // Serialize connections
  diagram.connections.forEach((connection) => {
    xmlParts.push(serializeConnection(connection));
  });

  // Serialize lines
  diagram.lines.forEach((line) => {
    xmlParts.push(serializeLine(line));
  });

  // Serialize arrows
  diagram.arrows.forEach((arrow) => {
    xmlParts.push(serializeArrow(arrow));
  });

  xmlParts.push('</ERDiagram>');

  return xmlParts.join('\n');
}

function serializeEntity(entity: Entity): string {
  const parts: string[] = [];
  parts.push(`  <entity id="${escapeXML(entity.id)}" name="${escapeXML(entity.name)}"`);
  parts.push(`    x="${entity.position.x}" y="${entity.position.y}"`);
  parts.push(`    width="${entity.size.width}" height="${entity.size.height}"`);
  parts.push(`    isWeak="${entity.isWeak}"`);
  if (entity.rotation !== undefined) {
    parts.push(`    rotation="${entity.rotation}"`);
  }
  parts.push('>');

  // Serialize entity attributes
  entity.attributes.forEach((attr) => {
    parts.push(serializeEntityAttribute(attr, '    '));
  });

  parts.push('  </entity>');
  return parts.join('\n');
}

function serializeRelationship(relationship: Relationship): string {
  const parts: string[] = [];
  parts.push(`  <relationship id="${escapeXML(relationship.id)}" name="${escapeXML(relationship.name)}"`);
  parts.push(`    x="${relationship.position.x}" y="${relationship.position.y}"`);
  parts.push(`    width="${relationship.size.width}" height="${relationship.size.height}"`);
  parts.push(`    isWeak="${relationship.isWeak}"`);
  if (relationship.rotation !== undefined) {
    parts.push(`    rotation="${relationship.rotation}"`);
  }
  parts.push('>');

  // Serialize connected entity IDs
  relationship.entityIds.forEach((entityId) => {
    parts.push(`    <entityId>${escapeXML(entityId)}</entityId>`);
  });

  // Serialize relationship attributes
  relationship.attributes.forEach((attr) => {
    parts.push(serializeEntityAttribute(attr, '    '));
  });

  // Serialize cardinalities
  Object.entries(relationship.cardinalities).forEach(([entityId, cardinality]) => {
    parts.push(`    <cardinality entityId="${escapeXML(entityId)}">${escapeXML(cardinality)}</cardinality>`);
  });

  // Serialize participations
  Object.entries(relationship.participations).forEach(([entityId, participation]) => {
    parts.push(`    <participation entityId="${escapeXML(entityId)}">${escapeXML(participation)}</participation>`);
  });

  parts.push('  </relationship>');
  return parts.join('\n');
}

function serializeAttribute(attribute: Attribute): string {
  const parts: string[] = [];
  parts.push(`  <attribute id="${escapeXML(attribute.id)}" name="${escapeXML(attribute.name)}"`);
  parts.push(`    x="${attribute.position.x}" y="${attribute.position.y}"`);
  parts.push(`    isKey="${attribute.isKey}"`);
  parts.push(`    isPartialKey="${attribute.isPartialKey}"`);
  parts.push(`    isMultivalued="${attribute.isMultivalued}"`);
  parts.push(`    isDerived="${attribute.isDerived}"`);
  if (attribute.entityId) {
    parts.push(`    entityId="${escapeXML(attribute.entityId)}"`);
  }
  if (attribute.relationshipId) {
    parts.push(`    relationshipId="${escapeXML(attribute.relationshipId)}"`);
  }
  parts.push('  />');
  return parts.join('\n');
}

function serializeEntityAttribute(attr: { id: string; name: string; isKey: boolean; isPartialKey: boolean; isMultivalued: boolean; isDerived: boolean }, indent: string): string {
  const parts: string[] = [];
  parts.push(`${indent}<attribute id="${escapeXML(attr.id)}" name="${escapeXML(attr.name)}"`);
  parts.push(`    isKey="${attr.isKey}"`);
  parts.push(`    isPartialKey="${attr.isPartialKey}"`);
  parts.push(`    isMultivalued="${attr.isMultivalued}"`);
  parts.push(`    isDerived="${attr.isDerived}"`);
  parts.push('  />');
  return parts.join('\n');
}

function serializeConnection(connection: Connection): string {
  const parts: string[] = [];
  parts.push(`  <connection id="${escapeXML(connection.id)}"`);
  parts.push(`    fromId="${escapeXML(connection.fromId)}" toId="${escapeXML(connection.toId)}"`);
  parts.push(`    fromPoint="${escapeXML(connection.fromPoint)}" toPoint="${escapeXML(connection.toPoint)}"`);
  parts.push(`    style="${escapeXML(connection.style)}"`);
  parts.push(`    cardinality="${escapeXML(connection.cardinality)}"`);
  parts.push(`    participation="${escapeXML(connection.participation)}"`);
  parts.push(`    points="${connection.points.join(',')}"`);

  if (connection.labelPosition) {
    parts.push(`    labelX="${connection.labelPosition.x}" labelY="${connection.labelPosition.y}"`);
  }

  parts.push('>');

  // Serialize waypoints
  connection.waypoints.forEach((waypoint) => {
    parts.push(`    <waypoint x="${waypoint.x}" y="${waypoint.y}" />`);
  });

  parts.push('  </connection>');
  return parts.join('\n');
}

function serializeLine(line: LineShape): string {
  return `  <line id="${escapeXML(line.id)}" points="${line.points.join(',')}" strokeWidth="${line.strokeWidth}" />`;
}

function serializeArrow(arrow: ArrowShape): string {
  const parts: string[] = [];
  parts.push(`  <arrow id="${escapeXML(arrow.id)}" type="${escapeXML(arrow.type)}"`);
  parts.push(`    points="${arrow.points.join(',')}"`);
  parts.push(`    strokeWidth="${arrow.strokeWidth}"`);
  parts.push(`    pointerLength="${arrow.pointerLength}"`);
  parts.push(`    pointerWidth="${arrow.pointerWidth}"`);
  parts.push('  />');
  return parts.join('\n');
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
