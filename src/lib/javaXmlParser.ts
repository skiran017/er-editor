import type { Diagram, Entity, Relationship, Attribute, EntityAttribute, Cardinality, Participation, ConnectionPoint } from '../types';
import { getClosestEdge } from './utils';

/**
 * Parse Java app XML format (ERDatabaseModel) into our Diagram format
 */
export function parseJavaXMLToDiagram(xmlString: string): Diagram {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid XML format: ' + parserError.textContent);
  }

  const root = xmlDoc.documentElement;
  if (root.tagName !== 'ERDatabaseModel') {
    throw new Error('Invalid Java XML format: root element must be <ERDatabaseModel>');
  }

  const diagram: Diagram = {
    entities: [],
    relationships: [],
    connections: [],
    lines: [],
    arrows: [],
    attributes: [],
  };

  // Get schema and diagram sections
  const schema = root.querySelector('ERDatabaseSchema');
  const diagramSection = root.querySelector('ERDatabaseDiagram');

  if (!schema) {
    throw new Error('Missing ERDatabaseSchema section');
  }

  // ID mapping: Java numeric IDs → our string IDs
  const idMap = new Map<string, string>();

  // Parse entities from EntitySets
  const entitySets = schema.querySelector('EntitySets');
  if (entitySets) {
    const strongEntities = entitySets.querySelectorAll('StrongEntitySet');
    const weakEntities = entitySets.querySelectorAll('WeakEntitySet');

    // Parse all strong entities
    strongEntities.forEach((elem) => {
      try {
        const javaId = elem.getAttribute('id');
        const name = elem.getAttribute('name');
        const entity = parseJavaEntity(elem, false, idMap);
        diagram.entities.push(entity);
        // Debug: log entity creation
        if (name === "ENTITA'_6" || javaId === "8") {
          console.log(`Created entity ENTITA'_6:`, { javaId, ourId: entity.id, name: entity.name, attributes: entity.attributes.length });
        }
      } catch (error) {
        console.error('Error parsing strong entity:', error, elem);
      }
    });

    // Parse all weak entities
    weakEntities.forEach((elem) => {
      try {
        const entity = parseJavaEntity(elem, true, idMap);
        diagram.entities.push(entity);
      } catch (error) {
        console.error('Error parsing weak entity:', error, elem);
      }
    });
  } else {
    console.warn('No EntitySets found in XML');
  }

  // Parse relationships from RelationshipSets
  const relationshipSets = schema.querySelector('RelationshipSets');
  if (relationshipSets) {
    const oneToOne = relationshipSets.querySelectorAll('RelationshipSetOneToOne');
    const oneToN = relationshipSets.querySelectorAll('RelationshipSetOneToN');
    const nToN = relationshipSets.querySelectorAll('RelationshipSetNToN');
    const identifyingOneToOne = relationshipSets.querySelectorAll('IdentifyingRelationshipSetOneToOne');
    const identifyingOneToN = relationshipSets.querySelectorAll('IdentifyingRelationshipSetOneToN');

    oneToOne.forEach((elem) => {
      const relationship = parseJavaRelationship(elem, 'OneToOne', idMap);
      diagram.relationships.push(relationship);
    });

    oneToN.forEach((elem) => {
      const relationship = parseJavaRelationship(elem, 'OneToN', idMap);
      diagram.relationships.push(relationship);
    });

    nToN.forEach((elem) => {
      const relationship = parseJavaRelationship(elem, 'NToN', idMap);
      diagram.relationships.push(relationship);
    });

    identifyingOneToOne.forEach((elem) => {
      const relationship = parseJavaRelationship(elem, 'OneToOne', idMap);
      diagram.relationships.push(relationship);
    });

    identifyingOneToN.forEach((elem) => {
      const relationship = parseJavaRelationship(elem, 'OneToN', idMap);
      diagram.relationships.push(relationship);
    });
  }

  // Parse positions from ERDatabaseDiagram
  if (diagramSection) {
    // Update entity positions
    diagram.entities.forEach((entity) => {
      const javaId = Array.from(idMap.entries()).find(([, ourId]) => ourId === entity.id)?.[0];
      if (javaId) {
        // Try both StrongEntitySet and WeakEntitySet
        const strongElem = diagramSection.querySelector(`StrongEntitySet[refid="${javaId}"]`);
        const weakElem = diagramSection.querySelector(`WeakEntitySet[refid="${javaId}"]`);
        const posElem = strongElem || weakElem;
        if (posElem) {
          const pos = posElem.querySelector('Position');
          if (pos) {
            const x = parseFloat(pos.getAttribute('x') || '0');
            const y = parseFloat(pos.getAttribute('y') || '0');
            // Java app uses CENTER-based coordinates for entities
            // Convert to top-left for our system
            entity.position.x = x - entity.size.width / 2;
            entity.position.y = y - entity.size.height / 2;

            // Debug: log position update for ENTITA'_6
            if (entity.name === "ENTITA'_6" || javaId === "8") {
              console.log(`Position updated for ENTITA'_6:`, {
                javaCenter: { x, y },
                ourTopLeft: { x: entity.position.x, y: entity.position.y },
                javaId
              });
            }
          } else {
            console.warn(`No Position element found for entity ${entity.name} (Java ID: ${javaId})`);
          }
        } else {
          // Entity exists but no position found - keep default (0,0) or use a default offset
          // This ensures the entity is still visible
          console.warn(`No position element found for entity ${entity.name} (Java ID: ${javaId})`);
          if (entity.name === "ENTITA'_6" || javaId === "8") {
            console.warn(`ENTITA'_6 position lookup failed!`, {
              javaId,
              ourId: entity.id,
              strongElem: !!strongElem,
              weakElem: !!weakElem,
              allStrongElems: diagramSection.querySelectorAll('StrongEntitySet[refid]').length
            });
          }
        }
      } else {
        console.warn(`No Java ID mapping found for entity ${entity.name} (ID: ${entity.id})`);
        if (entity.name === "ENTITA'_6") {
          console.error(`ENTITA'_6 has no Java ID mapping!`, {
            entityId: entity.id,
            idMapEntries: Array.from(idMap.entries()).slice(0, 5)
          });
        }
      }
    });

    // Update relationship positions
    diagram.relationships.forEach((relationship) => {
      const javaId = Array.from(idMap.entries()).find(([, ourId]) => ourId === relationship.id)?.[0];
      if (javaId) {
        // Try all relationship types (including Identifying* for total participation)
        const oneToOne = diagramSection.querySelector(`RelationshipSetOneToOne[refid="${javaId}"]`);
        const oneToN = diagramSection.querySelector(`RelationshipSetOneToN[refid="${javaId}"]`);
        const nToN = diagramSection.querySelector(`RelationshipSetNToN[refid="${javaId}"]`);
        const identifyingOneToOne = diagramSection.querySelector(`IdentifyingRelationshipSetOneToOne[refid="${javaId}"]`);
        const identifyingOneToN = diagramSection.querySelector(`IdentifyingRelationshipSetOneToN[refid="${javaId}"]`);
        const posElem = oneToOne || oneToN || nToN || identifyingOneToOne || identifyingOneToN;
        if (posElem) {
          const pos = posElem.querySelector('Position');
          if (pos) {
            const x = parseFloat(pos.getAttribute('x') || '0');
            const y = parseFloat(pos.getAttribute('y') || '0');
            // Java app uses CENTER-based coordinates for relationships too
            // Convert to top-left for our system
            relationship.position.x = x - relationship.size.width / 2;
            relationship.position.y = y - relationship.size.height / 2;
          }
        }
      }
    });

    // Parse standalone attributes (canvas attributes)
    const attributeElements = diagramSection.querySelectorAll('SimpleAttribute[refid]');
    attributeElements.forEach((attrElem) => {
      const javaAttrId = attrElem.getAttribute('refid');
      if (javaAttrId) {
        // Find the attribute in entities or relationships
        let foundAttribute: EntityAttribute | null = null;
        let parentEntityId: string | undefined;
        let parentRelationshipId: string | undefined;

        // Search in entities - find the exact attribute by Java ID
        for (const entity of diagram.entities) {
          const attr = entity.attributes.find(a => {
            const attrJavaId = Array.from(idMap.entries()).find(([, ourId]) => ourId === a.id)?.[0];
            if (attrJavaId === javaAttrId) {
              // Debug: log attribute matching
              if (javaAttrId === "9" || javaAttrId === "10" || javaAttrId === "11" || javaAttrId === "12") {
                console.log(`Matched attribute Java ID ${javaAttrId} to entity ${entity.name} (Java ID: ${Array.from(idMap.entries()).find(([, ourId]) => ourId === entity.id)?.[0]})`);
              }
              return true;
            }
            return false;
          });
          if (attr) {
            foundAttribute = attr;
            parentEntityId = entity.id;
            break;
          }
        }

        // Search in relationships if not found
        if (!foundAttribute) {
          for (const relationship of diagram.relationships) {
            const attr = relationship.attributes.find(a => {
              const attrJavaId = Array.from(idMap.entries()).find(([, ourId]) => ourId === a.id)?.[0];
              return attrJavaId === javaAttrId;
            });
            if (attr) {
              foundAttribute = attr;
              parentRelationshipId = relationship.id;
              break;
            }
          }
        }

        if (foundAttribute) {
          const pos = attrElem.querySelector('Position');
          if (pos) {
            const x = parseFloat(pos.getAttribute('x') || '0');
            const y = parseFloat(pos.getAttribute('y') || '0');

            // Java app uses CENTER-based coordinates for attributes too
            // Convert to top-left for our system
            // Typical attribute size: ~80x30 (will be calculated dynamically in AttributeShape)
            const defaultAttrWidth = 80;
            const defaultAttrHeight = 30;
            const attrTopLeftX = x - defaultAttrWidth / 2;
            const attrTopLeftY = y - defaultAttrHeight / 2;

            // Check if canvas attribute already exists (avoid duplicates)
            const existingAttr = diagram.attributes.find(a => a.id === foundAttribute.id);
            if (!existingAttr) {
              // Create canvas attribute
              const canvasAttribute: Attribute = {
                id: foundAttribute.id,
                type: 'attribute',
                name: foundAttribute.name,
                position: { x: attrTopLeftX, y: attrTopLeftY },
                selected: false,
                isKey: foundAttribute.isKey,
                isPartialKey: foundAttribute.isPartialKey,
                isMultivalued: foundAttribute.isMultivalued,
                isDerived: foundAttribute.isDerived,
                entityId: parentEntityId,
                relationshipId: parentRelationshipId,
              };
              diagram.attributes.push(canvasAttribute);
            } else {
              // Update position if attribute already exists
              existingAttr.position = { x: attrTopLeftX, y: attrTopLeftY };
              // Also ensure entityId/relationshipId are set
              if (parentEntityId) existingAttr.entityId = parentEntityId;
              if (parentRelationshipId) existingAttr.relationshipId = parentRelationshipId;
            }
          }
        }
      }
    });

    // Create canvas attributes for all entity/relationship attributes that don't have positions
    // This ensures all attributes are visible, even if they weren't in ERDatabaseDiagram
    diagram.entities.forEach((entity) => {
      entity.attributes.forEach((attr) => {
        const existingCanvasAttr = diagram.attributes.find(a => a.id === attr.id);
        if (!existingCanvasAttr) {
          // Create canvas attribute with default position (to the right of entity)
          const attrCount = diagram.attributes.filter(a => a.entityId === entity.id).length;
          const canvasAttribute: Attribute = {
            id: attr.id,
            type: 'attribute',
            name: attr.name,
            position: {
              x: entity.position.x + entity.size.width + 40,
              y: entity.position.y + 20 + attrCount * 30,
            },
            selected: false,
            isKey: attr.isKey,
            isPartialKey: attr.isPartialKey,
            isMultivalued: attr.isMultivalued,
            isDerived: attr.isDerived,
            entityId: entity.id,
          };
          diagram.attributes.push(canvasAttribute);
        }
      });
    });

    diagram.relationships.forEach((relationship) => {
      relationship.attributes.forEach((attr) => {
        const existingCanvasAttr = diagram.attributes.find(a => a.id === attr.id);
        if (!existingCanvasAttr) {
          // Create canvas attribute with default position (to the right of relationship)
          const attrCount = diagram.attributes.filter(a => a.relationshipId === relationship.id).length;
          const canvasAttribute: Attribute = {
            id: attr.id,
            type: 'attribute',
            name: attr.name,
            position: {
              x: relationship.position.x + relationship.size.width + 40,
              y: relationship.position.y + 20 + attrCount * 30,
            },
            selected: false,
            isKey: attr.isKey,
            isPartialKey: attr.isPartialKey,
            isMultivalued: attr.isMultivalued,
            isDerived: attr.isDerived,
            relationshipId: relationship.id,
          };
          diagram.attributes.push(canvasAttribute);
        }
      });
    });
  }

  // Generate connections from relationships
  // This must happen AFTER positions are set from ERDatabaseDiagram
  diagram.relationships.forEach((relationship) => {
    relationship.entityIds.forEach((entityId) => {
      // Create a connection for each entity-relationship pair
      // We need to determine cardinality and participation from the relationship
      const cardinality = relationship.cardinalities[entityId] || '1';
      const participation = relationship.participations[entityId] || 'partial';

      const entity = diagram.entities.find(e => e.id === entityId);
      if (entity) {
        // Calculate closest edges using actual positions
        const entityCenter = {
          x: entity.position.x + entity.size.width / 2,
          y: entity.position.y + entity.size.height / 2,
        };
        const relationshipCenter = {
          x: relationship.position.x + relationship.size.width / 2,
          y: relationship.position.y + relationship.size.height / 2,
        };

        // Determine connection points based on closest edges
        const fromPoint = getClosestEdge(relationshipCenter, {
          position: entity.position,
          size: entity.size,
        }) as ConnectionPoint;
        const toPoint = getClosestEdge(entityCenter, {
          position: relationship.position,
          size: relationship.size,
        }) as ConnectionPoint;

        // Calculate actual connection point positions
        const getConnectionPointPosition = (
          element: { position: { x: number; y: number }; size: { width: number; height: number } },
          point: ConnectionPoint
        ) => {
          const centerX = element.position.x + element.size.width / 2;
          const centerY = element.position.y + element.size.height / 2;
          switch (point) {
            case 'top':
              return { x: centerX, y: element.position.y };
            case 'right':
              return { x: element.position.x + element.size.width, y: centerY };
            case 'bottom':
              return { x: centerX, y: element.position.y + element.size.height };
            case 'left':
              return { x: element.position.x, y: centerY };
            case 'center':
            default:
              return { x: centerX, y: centerY };
          }
        };

        const fromPos = getConnectionPointPosition(entity, fromPoint);
        const toPos = getConnectionPointPosition(relationship, toPoint);

        const connection = {
          id: generateId(),
          type: 'connection' as const,
          fromId: entityId,
          toId: relationship.id,
          fromPoint,
          toPoint,
          points: [fromPos.x, fromPos.y, toPos.x, toPos.y],
          waypoints: [],
          style: 'orthogonal' as const, // Java app uses orthogonal routing (horizontal + vertical only)
          cardinality: cardinality as Cardinality,
          participation: participation as Participation,
          position: { x: Math.min(fromPos.x, toPos.x), y: Math.min(fromPos.y, toPos.y) },
          selected: false,
        };
        diagram.connections.push(connection);
      }
    });
  });

  // Debug: Log final diagram state
  console.log(`Final diagram state:`, {
    entities: diagram.entities.length,
    relationships: diagram.relationships.length,
    attributes: diagram.attributes.length,
    connections: diagram.connections.length,
    entityNames: diagram.entities.map(e => e.name),
    entityWith6: diagram.entities.find(e => e.name === "ENTITA'_6")
  });

  return diagram;
}

function parseJavaEntity(elem: Element, isWeak: boolean, idMap: Map<string, string>): Entity {
  const javaId = elem.getAttribute('id') || '';
  const name = elem.getAttribute('name') || 'Entity';
  const ourId = generateId();
  idMap.set(javaId, ourId);

  // Default size - Java app might use smaller size
  // Testing with smaller size based on attribute positions
  const width = 100;
  const height = 50;

  // Parse attributes
  const attributes: EntityAttribute[] = [];
  const attributesElem = elem.querySelector('Attributes');
  if (attributesElem) {
    const simpleAttrs = attributesElem.querySelectorAll('SimpleAttribute');
    simpleAttrs.forEach((attrElem) => {
      const attrJavaId = attrElem.getAttribute('id') || '';
      const attrName = attrElem.getAttribute('name') || 'Attribute';
      const multiValued = attrElem.getAttribute('multiValued') === 'true';
      const derived = attrElem.getAttribute('derived') === 'true';

      const attrOurId = generateId();
      idMap.set(attrJavaId, attrOurId);

      const attr: EntityAttribute = {
        id: attrOurId,
        name: attrName,
        isKey: false,
        isPartialKey: false,
        isMultivalued: multiValued,
        isDerived: derived,
      };

      attributes.push(attr);
    });
  }

  // Parse PrimaryKey (sets isKey = true)
  const primaryKey = elem.querySelector('PrimaryKey');
  if (primaryKey) {
    const keyAttrs = primaryKey.querySelectorAll('SimpleAttribute[refid]');
    keyAttrs.forEach((keyAttr) => {
      const refId = keyAttr.getAttribute('refid');
      if (refId) {
        const attrOurId = idMap.get(refId);
        if (attrOurId) {
          const attr = attributes.find(a => a.id === attrOurId);
          if (attr) {
            attr.isKey = true;
          }
        }
      }
    });
  }

  // Parse Discriminant (sets isPartialKey = true)
  const discriminant = elem.querySelector('Discriminant');
  if (discriminant) {
    const discAttrs = discriminant.querySelectorAll('SimpleAttribute[refid]');
    discAttrs.forEach((discAttr) => {
      const refId = discAttr.getAttribute('refid');
      if (refId) {
        const attrOurId = idMap.get(refId);
        if (attrOurId) {
          const attr = attributes.find(a => a.id === attrOurId);
          if (attr) {
            attr.isPartialKey = true;
          }
        }
      }
    });
  }

  return {
    id: ourId,
    type: 'entity',
    name,
    position: { x: 0, y: 0 }, // Will be updated from ERDatabaseDiagram
    selected: false,
    attributes,
    isWeak,
    size: { width, height },
  };
}

function parseJavaRelationship(
  elem: Element,
  _relType: 'OneToOne' | 'OneToN' | 'NToN',
  idMap: Map<string, string>
): Relationship {
  const javaId = elem.getAttribute('id') || '';
  const name = elem.getAttribute('name') || 'Relationship';
  const ourId = generateId();
  idMap.set(javaId, ourId);

  // Default size - match entity size for consistency
  const width = 100;
  const height = 50;

  // Parse attributes
  const attributes: EntityAttribute[] = [];
  const attributesElem = elem.querySelector('Attributes');
  if (attributesElem) {
    const simpleAttrs = attributesElem.querySelectorAll('SimpleAttribute');
    simpleAttrs.forEach((attrElem) => {
      const attrJavaId = attrElem.getAttribute('id') || '';
      const attrName = attrElem.getAttribute('name') || 'Attribute';
      const multiValued = attrElem.getAttribute('multiValued') === 'true';
      const derived = attrElem.getAttribute('derived') === 'true';

      const attrOurId = generateId();
      idMap.set(attrJavaId, attrOurId);

      attributes.push({
        id: attrOurId,
        name: attrName,
        isKey: false,
        isPartialKey: false,
        isMultivalued: multiValued,
        isDerived: derived,
      });
    });
  }

  // Parse branches to get entityIds, cardinalities, and participations
  const entityIds: string[] = [];
  const cardinalities: Record<string, Cardinality> = {};
  const participations: Record<string, Participation> = {};

  const branches = elem.querySelector('Branches');
  if (branches) {
    const branchElements = branches.querySelectorAll('RelationshipSetBranch');
    branchElements.forEach((branch) => {
      const cardinalityStr = branch.getAttribute('cardinality') || '1';
      const totalParticipation = branch.getAttribute('totalParticipation') === 'true';

      // Map cardinality: "1" -> "1", "N" -> "N", "M" -> "M"
      const cardinality = (cardinalityStr === '1' ? '1' : cardinalityStr === 'N' ? 'N' : 'M') as Cardinality;
      const participation = (totalParticipation ? 'total' : 'partial') as Participation;

      // Find entity reference
      const entityRef = branch.querySelector('StrongEntitySet[refid], WeakEntitySet[refid]');
      if (entityRef) {
        const entityJavaId = entityRef.getAttribute('refid');
        if (entityJavaId) {
          const entityOurId = idMap.get(entityJavaId);
          if (entityOurId) {
            entityIds.push(entityOurId);
            cardinalities[entityOurId] = cardinality;
            participations[entityOurId] = participation;
          }
        }
      }
    });
  }

  return {
    id: ourId,
    type: 'relationship',
    name,
    position: { x: 0, y: 0 }, // Will be updated from ERDatabaseDiagram
    selected: false,
    entityIds,
    attributes,
    cardinalities,
    participations,
    isWeak: false, // Java format doesn't have weak relationships in the same way
    size: { width, height },
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

