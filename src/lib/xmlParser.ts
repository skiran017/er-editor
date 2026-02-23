import type { Diagram, Entity, Relationship, Attribute, Connection, LineShape, ArrowShape, EntityAttribute, Position, Cardinality, Participation, ConnectionPoint, ConnectionStyle, Generalization } from '../types';
import { parseJavaXMLToDiagram } from './javaXmlParser';

/**
 * Detect XML format and parse accordingly
 */
export function detectXMLFormat(xmlString: string): 'java' | 'standard' {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const root = xmlDoc.documentElement;

  if (root.tagName === 'ERDatabaseModel') {
    return 'java';
  } else if (root.tagName === 'ERDiagram') {
    return 'standard';
  }

  // Default to standard format for backward compatibility
  return 'standard';
}

/**
 * Parse XML string into Diagram object
 * Auto-detects format (Java app format or standard format)
 */
export function parseXMLToDiagram(xmlString: string): Diagram {
  const format = detectXMLFormat(xmlString);

  if (format === 'java') {
    return parseJavaXMLToDiagram(xmlString);
  }

  // Standard format parsing
  return parseStandardXMLToDiagram(xmlString);
}

/**
 * Parse standard XML format (ERDiagram) into Diagram object
 */
function parseStandardXMLToDiagram(xmlString: string): Diagram {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid XML format: ' + parserError.textContent);
  }

  const diagram: Diagram = {
    entities: [],
    relationships: [],
    connections: [],
    generalizations: [],
    lines: [],
    arrows: [],
    attributes: [],
  };

  const root = xmlDoc.documentElement;
  if (root.tagName !== 'ERDiagram') {
    throw new Error('Invalid ER diagram XML: root element must be <ERDiagram>');
  }

  // Parse entities
  const entityElements = root.querySelectorAll('entity');
  entityElements.forEach((elem) => {
    const entity = parseEntity(elem);
    diagram.entities.push(entity);
  });

  // Parse relationships
  const relationshipElements = root.querySelectorAll('relationship');
  relationshipElements.forEach((elem) => {
    const relationship = parseRelationship(elem);
    diagram.relationships.push(relationship);
  });

  // Parse attributes (standalone canvas attributes)
  const attributeElements = root.querySelectorAll('attribute[entityId], attribute[relationshipId]');
  attributeElements.forEach((elem) => {
    const attribute = parseAttribute(elem);
    diagram.attributes.push(attribute);
  });

  // Parse connections
  const connectionElements = root.querySelectorAll('connection');
  connectionElements.forEach((elem) => {
    const connection = parseConnection(elem);
    diagram.connections.push(connection);
  });

  // Parse generalizations
  const generalizationElements = root.querySelectorAll('generalization');
  generalizationElements.forEach((elem) => {
    const generalization = parseGeneralization(elem);
    diagram.generalizations.push(generalization);
  });

  // Parse lines
  const lineElements = root.querySelectorAll('line');
  lineElements.forEach((elem) => {
    const line = parseLine(elem);
    diagram.lines.push(line);
  });

  // Parse arrows
  const arrowElements = root.querySelectorAll('arrow');
  arrowElements.forEach((elem) => {
    const arrow = parseArrow(elem);
    diagram.arrows.push(arrow);
  });

  return diagram;
}

function parseEntity(elem: Element): Entity {
  const id = elem.getAttribute('id') || generateId();
  const name = elem.getAttribute('name') || 'Entity';
  const x = parseFloat(elem.getAttribute('x') || '0');
  const y = parseFloat(elem.getAttribute('y') || '0');
  const width = parseFloat(elem.getAttribute('width') || '150');
  const height = parseFloat(elem.getAttribute('height') || '80');
  const isWeak = elem.getAttribute('isWeak') === 'true';
  const rotation = elem.getAttribute('rotation') ? parseFloat(elem.getAttribute('rotation')!) : undefined;

  const attributes: EntityAttribute[] = [];
  const attributeElements = elem.querySelectorAll('attribute');
  attributeElements.forEach((attrElem) => {
    attributes.push(parseEntityAttribute(attrElem));
  });

  return {
    id,
    type: 'entity',
    name,
    position: { x, y },
    selected: false,
    attributes,
    isWeak,
    size: { width, height },
    rotation,
  };
}

function parseRelationship(elem: Element): Relationship {
  const id = elem.getAttribute('id') || generateId();
  const name = elem.getAttribute('name') || 'Relationship';
  const x = parseFloat(elem.getAttribute('x') || '0');
  const y = parseFloat(elem.getAttribute('y') || '0');
  const width = parseFloat(elem.getAttribute('width') || '120');
  const height = parseFloat(elem.getAttribute('height') || '80');
  const isWeak = elem.getAttribute('isWeak') === 'true';
  const rotation = elem.getAttribute('rotation') ? parseFloat(elem.getAttribute('rotation')!) : undefined;

  const entityIds: string[] = [];
  const entityIdElements = elem.querySelectorAll('entityId');
  entityIdElements.forEach((e) => {
    const entityId = e.textContent;
    if (entityId) entityIds.push(entityId);
  });

  const attributes: EntityAttribute[] = [];
  const attributeElements = elem.querySelectorAll('attribute');
  attributeElements.forEach((attrElem) => {
    attributes.push(parseEntityAttribute(attrElem));
  });

  const cardinalities: Record<string, Cardinality> = {};
  const cardinalityElements = elem.querySelectorAll('cardinality');
  cardinalityElements.forEach((c) => {
    const entityId = c.getAttribute('entityId');
    const value = (c.textContent || '1') as Cardinality;
    if (entityId) cardinalities[entityId] = value;
  });

  const participations: Record<string, Participation> = {};
  const participationElements = elem.querySelectorAll('participation');
  participationElements.forEach((p) => {
    const entityId = p.getAttribute('entityId');
    const value = (p.textContent || 'partial') as Participation;
    if (entityId) participations[entityId] = value;
  });

  return {
    id,
    type: 'relationship',
    name,
    position: { x, y },
    selected: false,
    entityIds,
    attributes,
    cardinalities,
    participations,
    isWeak,
    size: { width, height },
    rotation,
  };
}

function parseAttribute(elem: Element): Attribute {
  const id = elem.getAttribute('id') || generateId();
  const name = elem.getAttribute('name') || 'Attribute';
  const x = parseFloat(elem.getAttribute('x') || '0');
  const y = parseFloat(elem.getAttribute('y') || '0');
  const entityId = elem.getAttribute('entityId') || undefined;
  const relationshipId = elem.getAttribute('relationshipId') || undefined;
  const parentAttributeId = elem.getAttribute('parentAttributeId') || undefined;
  const isKey = elem.getAttribute('isKey') === 'true';
  const isDiscriminant = elem.getAttribute('isDiscriminant') === 'true' || elem.getAttribute('isPartialKey') === 'true';
  const isMultivalued = elem.getAttribute('isMultivalued') === 'true';
  const isDerived = elem.getAttribute('isDerived') === 'true';
  const isComposite = elem.getAttribute('isComposite') === 'true';
  const subAttributeIdsStr = elem.getAttribute('subAttributeIds');
  const subAttributeIds = subAttributeIdsStr ? subAttributeIdsStr.split(',').filter(Boolean) : undefined;

  return {
    id,
    type: 'attribute',
    name,
    position: { x, y },
    selected: false,
    isKey,
    isDiscriminant,
    isMultivalued,
    isDerived,
    entityId,
    relationshipId,
    parentAttributeId,
    isComposite: isComposite || undefined,
    subAttributeIds: subAttributeIds && subAttributeIds.length > 0 ? subAttributeIds : undefined,
  };
}

function parseEntityAttribute(elem: Element): EntityAttribute {
  const id = elem.getAttribute('id') || generateId();
  const name = elem.getAttribute('name') || 'Attribute';
  const isKey = elem.getAttribute('isKey') === 'true';
  const isDiscriminant = elem.getAttribute('isDiscriminant') === 'true' || elem.getAttribute('isPartialKey') === 'true';
  const isMultivalued = elem.getAttribute('isMultivalued') === 'true';
  const isDerived = elem.getAttribute('isDerived') === 'true';
  const isComposite = elem.getAttribute('isComposite') === 'true';

  return {
    id,
    name,
    isKey,
    isDiscriminant,
    isMultivalued,
    isDerived,
    isComposite: isComposite || undefined,
  };
}

function parseGeneralization(elem: Element): Generalization {
  const id = elem.getAttribute('id') || generateId();
  const parentId = elem.getAttribute('parentId') || '';
  const x = parseFloat(elem.getAttribute('x') || '0');
  const y = parseFloat(elem.getAttribute('y') || '0');
  const width = parseFloat(elem.getAttribute('width') || '60');
  const height = parseFloat(elem.getAttribute('height') || '40');
  const isTotal = elem.getAttribute('isTotal') === 'true';

  const childIds: string[] = [];
  const childIdElements = elem.querySelectorAll('childId');
  childIdElements.forEach((c) => {
    const childId = c.textContent?.trim();
    if (childId) childIds.push(childId);
  });

  return {
    id,
    type: 'generalization',
    position: { x, y },
    selected: false,
    parentId,
    childIds,
    isTotal,
    size: { width, height },
  };
}

function parseConnection(elem: Element): Connection {
  const id = elem.getAttribute('id') || generateId();
  const fromId = elem.getAttribute('fromId') || '';
  const toId = elem.getAttribute('toId') || '';
  const fromPoint = (elem.getAttribute('fromPoint') || 'right') as ConnectionPoint;
  const toPoint = (elem.getAttribute('toPoint') || 'left') as ConnectionPoint;
  const style = (elem.getAttribute('style') || 'straight') as ConnectionStyle;
  const cardinality = (elem.getAttribute('cardinality') || '1') as Cardinality;
  const participation = (elem.getAttribute('participation') || 'partial') as Participation;

  const points: number[] = [];
  const pointsStr = elem.getAttribute('points');
  if (pointsStr) {
    points.push(...pointsStr.split(',').map((p) => parseFloat(p.trim())));
  }

  const waypoints: Position[] = [];
  const waypointElements = elem.querySelectorAll('waypoint');
  waypointElements.forEach((wp) => {
    const x = parseFloat(wp.getAttribute('x') || '0');
    const y = parseFloat(wp.getAttribute('y') || '0');
    waypoints.push({ x, y });
  });

  const labelX = elem.getAttribute('labelX') ? parseFloat(elem.getAttribute('labelX')!) : undefined;
  const labelY = elem.getAttribute('labelY') ? parseFloat(elem.getAttribute('labelY')!) : undefined;
  const labelPosition = labelX !== undefined && labelY !== undefined ? { x: labelX, y: labelY } : undefined;
  const role = elem.getAttribute('role') || undefined;

  // Calculate position from points
  const minX = points.length > 0 ? Math.min(...points.filter((_, i) => i % 2 === 0)) : 0;
  const minY = points.length > 0 ? Math.min(...points.filter((_, i) => i % 2 === 1)) : 0;

  return {
    id,
    type: 'connection',
    fromId,
    toId,
    fromPoint,
    toPoint,
    points,
    waypoints,
    style,
    cardinality,
    participation,
    position: { x: minX, y: minY },
    selected: false,
    labelPosition,
    role,
  };
}

function parseLine(elem: Element): LineShape {
  const id = elem.getAttribute('id') || generateId();
  const pointsStr = elem.getAttribute('points') || '';
  const points = pointsStr.split(',').map((p) => parseFloat(p.trim()));
  const strokeWidth = parseFloat(elem.getAttribute('strokeWidth') || '2');

  const minX = points.length > 0 ? Math.min(...points.filter((_, i) => i % 2 === 0)) : 0;
  const minY = points.length > 0 ? Math.min(...points.filter((_, i) => i % 2 === 1)) : 0;

  return {
    id,
    type: 'line',
    position: { x: minX, y: minY },
    selected: false,
    points,
    strokeWidth,
  };
}

function parseArrow(elem: Element): ArrowShape {
  const id = elem.getAttribute('id') || generateId();
  const type = (elem.getAttribute('type') || 'arrow-right') as 'arrow-left' | 'arrow-right';
  const pointsStr = elem.getAttribute('points') || '';
  const points = pointsStr.split(',').map((p) => parseFloat(p.trim()));
  const strokeWidth = parseFloat(elem.getAttribute('strokeWidth') || '2');
  const pointerLength = parseFloat(elem.getAttribute('pointerLength') || '15');
  const pointerWidth = parseFloat(elem.getAttribute('pointerWidth') || '15');

  const minX = points.length > 0 ? Math.min(...points.filter((_, i) => i % 2 === 0)) : 0;
  const minY = points.length > 0 ? Math.min(...points.filter((_, i) => i % 2 === 1)) : 0;

  return {
    id,
    type,
    position: { x: minX, y: minY },
    selected: false,
    points,
    strokeWidth,
    pointerLength,
    pointerWidth,
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

