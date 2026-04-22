import type { Diagram, Entity, Relationship } from '../types';

/**
 * Serialize our Diagram format to Java app XML format (ERDatabaseModel)
 */
export function serializeDiagramToJavaXML(diagram: Diagram): string {
  const xmlParts: string[] = [];

  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push('<ERDatabaseModel>');

  // ID mapping: our string IDs → Java numeric IDs
  const idMap = new Map<string, number>();
  let nextId = 1;

  const getJavaId = (ourId: string): number => {
    if (!idMap.has(ourId)) {
      idMap.set(ourId, nextId++);
    }
    return idMap.get(ourId)!;
  };

  // Start ERDatabaseSchema
  xmlParts.push('  <ERDatabaseSchema name="Unnamed_DB_Schema_1" lastId="' + (nextId - 1) + '">');

  // Serialize EntitySets
  xmlParts.push('    <EntitySets>');
  diagram.entities.forEach((entity) => {
    xmlParts.push(serializeJavaEntity(entity, getJavaId));
  });
  xmlParts.push('    </EntitySets>');

  // Serialize RelationshipSets
  xmlParts.push('    <RelationshipSets>');
  diagram.relationships.forEach((relationship) => {
    xmlParts.push(serializeJavaRelationship(relationship, getJavaId, diagram));
  });
  xmlParts.push('    </RelationshipSets>');

  // Generalizations - Java app uses Generalization (partial) and TotalGeneralization (total)
  if (diagram.generalizations && diagram.generalizations.length > 0) {
    xmlParts.push('    <Generalizations>');
    diagram.generalizations.forEach((gen) => {
      const tagName = gen.isTotal ? 'TotalGeneralization' : 'Generalization';
      const parentJavaId = getJavaId(gen.parentId);
      xmlParts.push(`      <${tagName} id="${getJavaId(gen.id)}" total="${gen.isTotal}">`);
      xmlParts.push('        <Parent>');
      xmlParts.push(`          <StrongEntitySet refid="${parentJavaId}" />`);
      xmlParts.push('        </Parent>');
      xmlParts.push('        <Children>');
      gen.childIds.forEach((childId) => {
        xmlParts.push(`          <StrongEntitySet refid="${getJavaId(childId)}" />`);
      });
      xmlParts.push('        </Children>');
      xmlParts.push(`      </${tagName}>`);
    });
    xmlParts.push('    </Generalizations>');
  } else {
    xmlParts.push('    <Generalizations />');
  }

  xmlParts.push('  </ERDatabaseSchema>');

  // Serialize ERDatabaseDiagram (positions)
  xmlParts.push('  <ERDatabaseDiagram>');

  // Serialize entity positions
  diagram.entities.forEach((entity) => {
    const javaId = getJavaId(entity.id);
    const entityType = entity.isWeak ? 'WeakEntitySet' : 'StrongEntitySet';
    // Java app uses CENTER-based coordinates, convert from our top-left
    const centerX = entity.position.x + entity.size.width / 2;
    const centerY = entity.position.y + entity.size.height / 2;
    xmlParts.push(`    <${entityType} refid="${javaId}">`);
    xmlParts.push(`      <Position x="${Math.round(centerX)}" y="${Math.round(centerY)}" />`);
    xmlParts.push(`    </${entityType}>`);
  });

  // Serialize relationship positions
  diagram.relationships.forEach((relationship) => {
    const javaId = getJavaId(relationship.id);
    const relType = determineRelationshipType(relationship);
    const tagName = getRelationshipTagName(relType);
    // Java app uses CENTER-based coordinates, convert from our top-left
    const centerX = relationship.position.x + relationship.size.width / 2;
    const centerY = relationship.position.y + relationship.size.height / 2;
    xmlParts.push(`    <${tagName} refid="${javaId}">`);
    xmlParts.push(`      <Position x="${Math.round(centerX)}" y="${Math.round(centerY)}" />`);
    xmlParts.push(`    </${tagName}>`);
  });

  // Serialize generalization positions - Java uses Generalization/TotalGeneralization in diagram
  (diagram.generalizations ?? []).forEach((gen) => {
    const javaId = getJavaId(gen.id);
    const tagName = gen.isTotal ? 'TotalGeneralization' : 'Generalization';
    const centerX = gen.position.x + gen.size.width / 2;
    const centerY = gen.position.y + gen.size.height / 2;
    xmlParts.push(`    <${tagName} refid="${javaId}">`);
    xmlParts.push(`      <Position x="${Math.round(centerX)}" y="${Math.round(centerY)}" />`);
    xmlParts.push(`    </${tagName}>`);
  });

  // Serialize standalone attribute positions
  diagram.attributes.forEach((attribute) => {
    const javaId = getJavaId(attribute.id);
    // Java app uses CENTER-based coordinates for attributes
    // Calculate approximate attribute size (same as in AttributeShape)
    const textWidth = attribute.name.length * 8 + 20;
    const attrWidth = Math.max(80, textWidth);
    const attrHeight = 30;
    const centerX = attribute.position.x + attrWidth / 2;
    const centerY = attribute.position.y + attrHeight / 2;
    xmlParts.push(`    <SimpleAttribute refid="${javaId}">`);
    xmlParts.push(`      <Position x="${Math.round(centerX)}" y="${Math.round(centerY)}" />`);
    xmlParts.push(`    </SimpleAttribute>`);
  });

  xmlParts.push('  </ERDatabaseDiagram>');
  xmlParts.push('</ERDatabaseModel>');

  return xmlParts.join('\n');
}

function serializeJavaEntity(entity: Entity, getJavaId: (id: string) => number): string {
  const parts: string[] = [];
  const javaId = getJavaId(entity.id);
  const entityType = entity.isWeak ? 'WeakEntitySet' : 'StrongEntitySet';

  parts.push(`      <${entityType} id="${javaId}" name="${escapeXML(entity.name)}">`);

  // Serialize attributes
  if (entity.attributes.length > 0) {
    parts.push('        <Attributes>');
    entity.attributes.forEach((attr) => {
      const attrJavaId = getJavaId(attr.id);
      parts.push(`          <SimpleAttribute id="${attrJavaId}" name="${escapeXML(attr.name)}" multiValued="${attr.isMultivalued}" derived="${attr.isDerived}" />`);
    });
    parts.push('        </Attributes>');
  } else {
    parts.push('        <Attributes />');
  }

  // Serialize PrimaryKey (attributes with isKey = true)
  const keyAttributes = entity.attributes.filter(attr => attr.isKey);
  if (keyAttributes.length > 0) {
    parts.push('        <PrimaryKey>');
    keyAttributes.forEach((attr) => {
      const attrJavaId = getJavaId(attr.id);
      parts.push(`          <SimpleAttribute refid="${attrJavaId}" />`);
    });
    parts.push('        </PrimaryKey>');
  }

  // Serialize Discriminant attributes
  const discriminantAttributes = entity.attributes.filter(attr => attr.isDiscriminant);
  if (discriminantAttributes.length > 0) {
    parts.push('        <Discriminant>');
    discriminantAttributes.forEach((attr) => {
      const attrJavaId = getJavaId(attr.id);
      parts.push(`          <SimpleAttribute refid="${attrJavaId}" />`);
    });
    parts.push('        </Discriminant>');
  }

  parts.push(`      </${entityType}>`);
  return parts.join('\n');
}

function serializeJavaRelationship(
  relationship: Relationship,
  getJavaId: (id: string) => number,
  diagram: Diagram
): string {
  const parts: string[] = [];
  const javaId = getJavaId(relationship.id);
  const relType = determineRelationshipType(relationship);
  const tagName = getRelationshipTagName(relType);

  parts.push(`      <${tagName} id="${javaId}" name="${escapeXML(relationship.name)}">`);

  // Serialize attributes
  if (relationship.attributes.length > 0) {
    parts.push('        <Attributes>');
    relationship.attributes.forEach((attr) => {
      const attrJavaId = getJavaId(attr.id);
      parts.push(`          <SimpleAttribute id="${attrJavaId}" name="${escapeXML(attr.name)}" multiValued="${attr.isMultivalued}" derived="${attr.isDerived}" />`);
    });
    parts.push('        </Attributes>');
  } else {
    parts.push('        <Attributes />');
  }

  // Serialize branches
  parts.push('        <Branches>');
  relationship.entityIds.forEach((entityId, index) => {
    const branchId = getJavaId(relationship.id + '_branch_' + index);
    const cardinality = relationship.cardinalities[entityId] || '1';
    const participation = relationship.participations[entityId] || 'partial';
    const totalParticipation = participation === 'total';

    // Map cardinality: "1" -> "1", "N" -> "N", "M" -> "M"
    const cardinalityStr = cardinality === '1' ? '1' : cardinality === 'N' ? 'N' : 'M';

    // Find entity to determine if it's strong or weak
    const entity = diagram.entities.find(e => e.id === entityId);
    const entityType = entity?.isWeak ? 'WeakEntitySet' : 'StrongEntitySet';
    const entityJavaId = getJavaId(entityId);

    parts.push(`          <RelationshipSetBranch id="${branchId}" cardinality="${cardinalityStr}" totalParticipation="${totalParticipation}" role="">`);
    parts.push(`            <${entityType} refid="${entityJavaId}" />`);
    parts.push('          </RelationshipSetBranch>');
  });
  parts.push('        </Branches>');

  parts.push(`      </${tagName}>`);
  return parts.join('\n');
}

/**
 * Determine Java relationship type from our relationship format.
 * Based on cardinalities: OneToOne (1-1), OneToN (1-N), NToN (N-N or M-M or multiple entities).
 * When any branch has total participation, use IdentifyingRelationshipSet* (Java format).
 */
function determineRelationshipType(
  relationship: Relationship
): 'OneToOne' | 'OneToN' | 'NToN' | 'IdentifyingOneToOne' | 'IdentifyingOneToN' {
  const entityIds = relationship.entityIds;
  if (entityIds.length === 0) {
    return 'OneToOne'; // Default
  }

  // Count cardinalities
  const cardinalities = entityIds.map((id) => relationship.cardinalities[id] || '1');
  const oneCount = cardinalities.filter((c) => c === '1').length;
  const nCount = cardinalities.filter((c) => c === 'N' || c === 'M').length;

  // Check if any branch has total participation
  const hasTotalParticipation = entityIds.some(
    (id) => relationship.participations[id] === 'total'
  );

  // OneToOne: exactly 2 entities, both with cardinality 1
  if (entityIds.length === 2 && oneCount === 2) {
    return hasTotalParticipation ? 'IdentifyingOneToOne' : 'OneToOne';
  }

  // OneToN: exactly 2 entities, one with 1, one with N
  if (entityIds.length === 2 && oneCount === 1 && nCount === 1) {
    return hasTotalParticipation ? 'IdentifyingOneToN' : 'OneToN';
  }

  // NToN: no Identifying variant in Java XML
  return 'NToN';
}

/** Java XML tag name for relationship (RelationshipSet* or IdentifyingRelationshipSet*) */
function getRelationshipTagName(
  relType: 'OneToOne' | 'OneToN' | 'NToN' | 'IdentifyingOneToOne' | 'IdentifyingOneToN'
): string {
  if (relType === 'IdentifyingOneToOne') return 'IdentifyingRelationshipSetOneToOne';
  if (relType === 'IdentifyingOneToN') return 'IdentifyingRelationshipSetOneToN';
  return `RelationshipSet${relType}`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

