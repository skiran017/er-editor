import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import type { Entity, Relationship, Connection, Generalization, EditorState, Position, LineShape, ArrowShape, Attribute, EntityAttribute, ConnectionPoint, ConnectionStyle, Cardinality, Participation, Diagram, ValidationError } from '../types';
import { getClosestEdge, getBestAvailableEdge, connectionExists } from '../lib/utils';
import { validateEntity, validateRelationship, validateAttribute, validateConnection, validateDiagram, isValidEntityName, checkUniqueEntityName, checkUniqueRelationshipName, checkUniqueAttributeName } from '../lib/validation';

interface EditorStore extends EditorState {
  // Entity actions
  addEntity: (position: Position) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;

  // Attribute actions
  addAttribute: (entityId: string, attribute: Omit<EntityAttribute, 'id'>, customPosition?: Position) => void;
  addRelationshipAttribute: (relationshipId: string, attribute: Omit<EntityAttribute, 'id'>, customPosition?: Position) => void;
  updateAttribute: (entityId: string, attributeId: string, updates: Partial<EntityAttribute>) => void;
  updateAttributeById: (attributeId: string, updates: Partial<Attribute>) => void;
  deleteAttribute: (entityId: string, attributeId: string) => void;
  deleteAttributeById: (attributeId: string) => void;
  updateAttributePosition: (attributeId: string, position: Position) => void;

  // Relationship actions
  addRelationship: (position: Position) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;

  // Line actions
  addLine: (points: number[]) => void;
  updateLine: (id: string, updates: Partial<LineShape>) => void;
  deleteLine: (id: string) => void;

  // Arrow actions
  addArrow: (type: 'arrow-left' | 'arrow-right', points: number[]) => void;
  updateArrow: (id: string, updates: Partial<ArrowShape>) => void;
  deleteArrow: (id: string) => void;

  // Connection actions
  addConnection: (fromId: string, toId: string, fromPoint?: ConnectionPoint, toPoint?: ConnectionPoint, waypoints?: Position[], style?: ConnectionStyle) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  addConnectionWaypoint: (connectionId: string, waypoint: Position, index?: number) => void;
  removeConnectionWaypoint: (connectionId: string, waypointIndex: number) => void;
  updateConnectionWaypoint: (connectionId: string, waypointIndex: number, position: Position) => void;

  // Selection actions
  selectElement: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectMultiple: (ids: string[]) => void;

  // Viewport actions
  setZoom: (scale: number) => void;
  setViewportPosition: (position: Position) => void;

  // Mode actions
  setMode: (mode: EditorState['mode']) => void;

  // Exam mode and validation actions
  setExamMode: (enabled: boolean) => void;
  setValidationEnabled: (enabled: boolean) => void;
  validateElement: (id: string) => void;
  validateAll: () => void;
  getValidationErrors: () => ValidationError[];
  clearWarnings: (id: string) => void;

  // Drawing state actions
  setDrawingLine: (isDrawing: boolean, startPoint?: Position | null, currentPoint?: Position | null) => void;
  setDrawingConnection: (isDrawing: boolean, fromId?: string | null, fromPoint?: ConnectionPoint | null, currentPoint?: Position | null, waypoints?: Position[]) => void;

  // Import/Export actions
  loadDiagram: (diagram: Diagram, replace: boolean) => void;

  // Quick relationship (1:1, 1:N, N:N) – two-click flow
  setPendingQuickRelationship: (payload: { firstEntityId: string; mode: 'relationship-1-1' | 'relationship-1-n' | 'relationship-n-n' } | null) => void;
  addRelationshipBetweenEntities: (entityId1: string, entityId2: string, type: '1-1' | '1-n' | 'n-n') => void;

  // Generalization (ISA) actions
  addGeneralization: (parentId: string, childId: string, isTotal: boolean) => void;
  updateGeneralization: (id: string, updates: Partial<Generalization>) => void;
  deleteGeneralization: (id: string) => void;
  addChildToGeneralization: (generalizationId: string, childEntityId: string) => void;
  setPendingQuickGeneralization: (payload: { firstEntityId: string; mode: 'generalization' | 'generalization-total' } | null) => void;
  addGeneralizationBetweenEntities: (childEntityId: string, parentEntityId: string, isTotal: boolean) => void;
  setPendingGeneralizationConnect: (generalizationId: string | null) => void;

  // Utility
  getElementById: (id: string) => Entity | Relationship | LineShape | ArrowShape | Attribute | Connection | Generalization | undefined;
  getConnectionPoints: (elementId: string) => Position[]; // Get connection points for an element
}

// Helper function to generate IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to get connection point position on an element
const getConnectionPointPosition = (element: Entity | Relationship, point: ConnectionPoint): Position => {
  const centerX = element.position.x + element.size.width / 2;
  const centerY = element.position.y + element.size.height / 2;

  // For relationships (diamonds), use diamond vertices
  if (element.type === 'relationship') {
    switch (point) {
      case 'top':
        // Top vertex of diamond
        return { x: centerX, y: element.position.y };
      case 'right':
        // Right vertex of diamond
        return { x: element.position.x + element.size.width, y: centerY };
      case 'bottom':
        // Bottom vertex of diamond
        return { x: centerX, y: element.position.y + element.size.height };
      case 'left':
        // Left vertex of diamond
        return { x: element.position.x, y: centerY };
      case 'center':
      default:
        return { x: centerX, y: centerY };
    }
  }

  // For entities (rectangles), use rectangle edges
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

/**
 * Auto-adjust connection points when an element moves
 * Finds all connections involving the moved element and recalculates the closest edges
 */
const updateConnectionPointsOnMove = (
  state: EditorState,
  movedElementId: string,
  movedElement: Entity | Relationship
): void => {
  // Find all connections involving this element
  const connections = state.diagram.connections.filter(
    (conn) => conn.fromId === movedElementId || conn.toId === movedElementId
  );

  connections.forEach((connection) => {
    // Find the other element in the connection
    const otherElementId = connection.fromId === movedElementId
      ? connection.toId
      : connection.fromId;

    const otherElement = state.diagram.entities.find(e => e.id === otherElementId) ||
      state.diagram.relationships.find(r => r.id === otherElementId);

    if (!otherElement) return;

    // Calculate centers for both elements
    const movedCenter = {
      x: movedElement.position.x + movedElement.size.width / 2,
      y: movedElement.position.y + movedElement.size.height / 2,
    };
    const otherCenter = {
      x: otherElement.position.x + otherElement.size.width / 2,
      y: otherElement.position.y + otherElement.size.height / 2,
    };

    // Determine new closest edges
    // For relationships, use edge distribution to avoid overlapping connections
    // For entities, use closest edge
    let newFromPoint: ConnectionPoint;
    let newToPoint: ConnectionPoint;

    if (connection.fromId === movedElementId) {
      // Moved element is the source (fromId)
      // Find which edge of movedElement is closest to otherElement's center
      if (movedElement.type === 'relationship') {
        // Use edge distribution for relationships
        newFromPoint = getBestAvailableEdge(
          movedElementId,
          state.diagram.connections.filter(c => c.id !== connection.id), // Exclude current connection
          otherCenter,
          movedElement
        ) as ConnectionPoint;
      } else {
        newFromPoint = getClosestEdge(otherCenter, {
          position: movedElement.position,
          size: movedElement.size,
        }) as ConnectionPoint;
      }

      // Find which edge of otherElement is closest to movedElement's center
      if (otherElement.type === 'relationship') {
        // Use edge distribution for relationships
        newToPoint = getBestAvailableEdge(
          otherElementId,
          state.diagram.connections.filter(c => c.id !== connection.id), // Exclude current connection
          movedCenter,
          otherElement
        ) as ConnectionPoint;
      } else {
        newToPoint = getClosestEdge(movedCenter, {
          position: otherElement.position,
          size: otherElement.size,
        }) as ConnectionPoint;
      }
    } else {
      // Moved element is the target (toId)
      // Find which edge of otherElement is closest to movedElement's center
      if (otherElement.type === 'relationship') {
        // Use edge distribution for relationships
        newFromPoint = getBestAvailableEdge(
          otherElementId,
          state.diagram.connections.filter(c => c.id !== connection.id), // Exclude current connection
          movedCenter,
          otherElement
        ) as ConnectionPoint;
      } else {
        newFromPoint = getClosestEdge(movedCenter, {
          position: otherElement.position,
          size: otherElement.size,
        }) as ConnectionPoint;
      }

      // Find which edge of movedElement is closest to otherElement's center
      if (movedElement.type === 'relationship') {
        // Use edge distribution for relationships
        newToPoint = getBestAvailableEdge(
          movedElementId,
          state.diagram.connections.filter(c => c.id !== connection.id), // Exclude current connection
          otherCenter,
          movedElement
        ) as ConnectionPoint;
      } else {
        newToPoint = getClosestEdge(otherCenter, {
          position: movedElement.position,
          size: movedElement.size,
        }) as ConnectionPoint;
      }
    }

    // Update connection points
    connection.fromPoint = newFromPoint;
    connection.toPoint = newToPoint;

    // Recalculate connection path
    const fromElement = connection.fromId === movedElementId
      ? movedElement
      : otherElement;
    const toElement = connection.toId === movedElementId
      ? movedElement
      : otherElement;

    const fromPos = getConnectionPointPosition(fromElement, connection.fromPoint);
    const toPos = getConnectionPointPosition(toElement, connection.toPoint);

    // Rebuild points array: from -> waypoints -> to
    const points: number[] = [fromPos.x, fromPos.y];
    connection.waypoints.forEach((wp) => {
      points.push(wp.x, wp.y);
    });
    points.push(toPos.x, toPos.y);
    connection.points = points;

    // Update position (bounding box)
    connection.position = {
      x: Math.min(fromPos.x, toPos.x),
      y: Math.min(fromPos.y, toPos.y),
    };
  });
};

export const useEditorStore = create<EditorStore>()(
  temporal(
    immer((set, get) => ({
      // Initial state
      diagram: {
        entities: [],
        relationships: [],
        connections: [],
        generalizations: [],
        lines: [],
        arrows: [],
        attributes: [],
      },
      selectedIds: [],
      history: {
        past: [],
        future: [],
      },
      viewport: {
        scale: 1,
        position: { x: 0, y: 0 },
      },
      mode: 'select',
      drawingLine: {
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
      },
      drawingConnection: {
        isDrawing: false,
        fromId: null,
        fromPoint: null,
        currentPoint: null,
        waypoints: [],
      },
      nextEntityNumber: 1,
      nextRelationshipNumber: 1,
      examMode: false, // Default: false, enabled via ?examMode=true
      validationEnabled: false, // Default: false, controlled via Menu toggle
      pendingQuickRelationship: null,
      pendingQuickGeneralization: null,
      pendingGeneralizationConnect: null,

      // Entity actions
      addEntity: (position) => {
        set((state) => {
          const newEntity: Entity = {
            id: generateId(),
            type: 'entity',
            name: `Entity ${state.nextEntityNumber}`,
            position,
            selected: false,
            attributes: [],
            isWeak: false,
            size: { width: 150, height: 80 },
            rotation: 0,
          };
          state.diagram.entities.push(newEntity);
          state.nextEntityNumber += 1;

          // Auto-validate if enabled
          if (state.validationEnabled) {
            const warnings = validateEntity(newEntity, state.diagram);
            newEntity.hasWarning = warnings.length > 0;
            newEntity.warnings = warnings;
          }
        });
      },

      updateEntity: (id, updates) => {
        set((state) => {
          const entity = state.diagram.entities.find((e) => e.id === id);
          if (entity) {
            // Prevent empty or duplicate names
            if (updates.name !== undefined && updates.name !== entity.name) {
              if (!isValidEntityName(updates.name)) {
                return; // Don't update if name is empty
              }
              if (!checkUniqueEntityName(id, updates.name, state.diagram)) {
                return; // Don't update if name is duplicate
              }
            }

            const positionChanged = updates.position && (
              updates.position.x !== entity.position.x ||
              updates.position.y !== entity.position.y
            );

            Object.assign(entity, updates);

            // Auto-adjust connection points if position changed
            if (positionChanged) {
              updateConnectionPointsOnMove(state, id, entity);
            }

            // Auto-validate if enabled
            if (state.validationEnabled) {
              const warnings = validateEntity(entity, state.diagram);
              entity.hasWarning = warnings.length > 0;
              entity.warnings = warnings;

              // Also validate affected relationships
              const affectedRelationships = state.diagram.relationships.filter(r =>
                r.entityIds.includes(id)
              );
              for (const rel of affectedRelationships) {
                const relWarnings = validateRelationship(rel, state.diagram);
                rel.hasWarning = relWarnings.length > 0;
                rel.warnings = relWarnings;
              }
            }
          }
        });
      },

      deleteEntity: (id) => {
        set((state) => {
          // Remove entity
          state.diagram.entities = state.diagram.entities.filter((e) => e.id !== id);

          // Remove associated attributes
          state.diagram.attributes = state.diagram.attributes.filter(
            (a) => a.entityId !== id
          );

          // Remove associated connections
          state.diagram.connections = state.diagram.connections.filter(
            (c) => c.fromId !== id && c.toId !== id
          );

          // Remove generalizations where this entity is parent or child
          state.diagram.generalizations = state.diagram.generalizations.filter(
            (g) => g.parentId !== id && !g.childIds.includes(id)
          );

          // Remove from selection
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);

          // Auto-validate affected relationships if enabled
          if (state.validationEnabled) {
            const affectedRelationships = state.diagram.relationships.filter(r =>
              r.entityIds.includes(id)
            );
            for (const rel of affectedRelationships) {
              const warnings = validateRelationship(rel, state.diagram);
              rel.hasWarning = warnings.length > 0;
              rel.warnings = warnings;
            }
          }
        });
      },

      // Attribute actions
      addAttribute: (entityId, attribute, customPosition) => {
        set((state) => {
          const entity = state.diagram.entities.find((e) => e.id === entityId);
          if (entity) {
            const attributeId = generateId();
            // Calculate position relative to entity (to the right side by default)
            const attributeCount = state.diagram.attributes.filter(a => a.entityId === entityId).length;
            const defaultPosition = {
              x: entity.position.x + entity.size.width + 40,
              y: entity.position.y + 20 + attributeCount * 30,
            };
            const newAttribute: Attribute = {
              id: attributeId,
              type: 'attribute',
              ...attribute,
              entityId,
              position: customPosition || defaultPosition,
              selected: false,
            };
            // Add to both entity's attributes array and diagram's attributes array
            entity.attributes.push({
              id: attributeId,
              name: attribute.name,
              isKey: attribute.isKey,
              isDiscriminant: attribute.isDiscriminant || false,
              isMultivalued: attribute.isMultivalued,
              isDerived: attribute.isDerived,
            });
            state.diagram.attributes.push(newAttribute);

            // Auto-validate if enabled
            if (state.validationEnabled) {
              const warnings = validateAttribute(newAttribute, state.diagram);
              newAttribute.hasWarning = warnings.length > 0;
              newAttribute.warnings = warnings;

              // Also validate parent entity
              const entityWarnings = validateEntity(entity, state.diagram);
              entity.hasWarning = entityWarnings.length > 0;
              entity.warnings = entityWarnings;
            }
          }
        });
      },

      updateAttribute: (entityId: string, attributeId: string, updates: Partial<EntityAttribute>) => {
        set((state) => {
          const entity = state.diagram.entities.find((e) => e.id === entityId);
          const canvasAttribute = state.diagram.attributes.find((a) => a.id === attributeId);

          if (entity) {
            const attribute = entity.attributes.find((a) => a.id === attributeId);
            if (attribute) {
              Object.assign(attribute, updates);
            }
          }

          // Also update canvas attribute
          if (canvasAttribute) {
            if (updates.name !== undefined) canvasAttribute.name = updates.name;
            if (updates.isKey !== undefined) canvasAttribute.isKey = updates.isKey;
            if (updates.isDiscriminant !== undefined) canvasAttribute.isDiscriminant = updates.isDiscriminant;
            if (updates.isMultivalued !== undefined) canvasAttribute.isMultivalued = updates.isMultivalued;
            if (updates.isDerived !== undefined) canvasAttribute.isDerived = updates.isDerived;

            // Auto-validate if enabled
            if (state.validationEnabled) {
              const warnings = validateAttribute(canvasAttribute, state.diagram);
              canvasAttribute.hasWarning = warnings.length > 0;
              canvasAttribute.warnings = warnings;

              // Also validate parent entity
              if (entity) {
                const entityWarnings = validateEntity(entity, state.diagram);
                entity.hasWarning = entityWarnings.length > 0;
                entity.warnings = entityWarnings;
              }
            }
          }
        });
      },

      deleteAttribute: (entityId, attributeId) => {
        set((state) => {
          const entity = state.diagram.entities.find((e) => e.id === entityId);
          if (entity) {
            entity.attributes = entity.attributes.filter((a) => a.id !== attributeId);
          }
          // Also remove from canvas attributes
          state.diagram.attributes = state.diagram.attributes.filter((a) => a.id !== attributeId);

          // Auto-validate parent entity if enabled
          if (state.validationEnabled && entity) {
            const warnings = validateEntity(entity, state.diagram);
            entity.hasWarning = warnings.length > 0;
            entity.warnings = warnings;
          }
        });
      },

      // Attribute position actions
      updateAttributePosition: (attributeId: string, position: Position) => {
        set((state) => {
          const attribute = state.diagram.attributes.find((a) => a.id === attributeId);
          if (attribute) {
            attribute.position = position;

            // Note: Attributes use lines (not connections) that are calculated dynamically in AttributeShape
            // The line automatically updates when attribute or parent position changes
            // No explicit connection point adjustment needed for attributes
          }
        });
      },

      addRelationshipAttribute: (relationshipId, attribute, customPosition) => {
        set((state) => {
          const relationship = state.diagram.relationships.find((r) => r.id === relationshipId);
          if (relationship) {
            const attributeId = generateId();
            // Calculate position relative to relationship (to the right side by default)
            const attributeCount = state.diagram.attributes.filter(a => a.relationshipId === relationshipId).length;
            const defaultPosition = {
              x: relationship.position.x + relationship.size.width + 40,
              y: relationship.position.y + 20 + attributeCount * 30,
            };
            const newAttribute: Attribute = {
              id: attributeId,
              type: 'attribute',
              ...attribute,
              relationshipId,
              position: customPosition || defaultPosition,
              selected: false,
            };
            // Add to both relationship's attributes array and diagram's attributes array
            relationship.attributes.push({
              id: attributeId,
              name: attribute.name,
              isKey: attribute.isKey,
              isDiscriminant: attribute.isDiscriminant || false,
              isMultivalued: attribute.isMultivalued,
              isDerived: attribute.isDerived,
            });
            state.diagram.attributes.push(newAttribute);
          }
        });
      },

      updateAttributeById: (attributeId, updates) => {
        set((state) => {
          const canvasAttribute = state.diagram.attributes.find((a) => a.id === attributeId);
          if (canvasAttribute) {
            // Prevent duplicate names within the same parent
            if (updates.name !== undefined && updates.name !== canvasAttribute.name) {
              if (!checkUniqueAttributeName(
                attributeId,
                updates.name,
                canvasAttribute.entityId,
                canvasAttribute.relationshipId,
                state.diagram
              )) {
                return; // Don't update if name is duplicate
              }
            }

            Object.assign(canvasAttribute, updates);
            // Also update in parent entity or relationship
            if (canvasAttribute.entityId) {
              const entity = state.diagram.entities.find((e) => e.id === canvasAttribute.entityId);
              if (entity) {
                const attribute = entity.attributes.find((a) => a.id === attributeId);
                if (attribute) {
                  if (updates.name !== undefined) attribute.name = updates.name;
                  if (updates.isKey !== undefined) attribute.isKey = updates.isKey;
                  if (updates.isDiscriminant !== undefined) attribute.isDiscriminant = updates.isDiscriminant;
                  if (updates.isMultivalued !== undefined) attribute.isMultivalued = updates.isMultivalued;
                  if (updates.isDerived !== undefined) attribute.isDerived = updates.isDerived;
                }
              }
            }
            if (canvasAttribute.relationshipId) {
              const relationship = state.diagram.relationships.find((r) => r.id === canvasAttribute.relationshipId);
              if (relationship) {
                const attribute = relationship.attributes.find((a) => a.id === attributeId);
                if (attribute) {
                  if (updates.name !== undefined) attribute.name = updates.name;
                  if (updates.isKey !== undefined) attribute.isKey = updates.isKey;
                  if (updates.isDiscriminant !== undefined) attribute.isDiscriminant = updates.isDiscriminant;
                  if (updates.isMultivalued !== undefined) attribute.isMultivalued = updates.isMultivalued;
                  if (updates.isDerived !== undefined) attribute.isDerived = updates.isDerived;
                }
              }
            }

            // Auto-validate if enabled
            if (state.validationEnabled) {
              const warnings = validateAttribute(canvasAttribute, state.diagram);
              canvasAttribute.hasWarning = warnings.length > 0;
              canvasAttribute.warnings = warnings;

              // Also validate parent entity or relationship
              if (canvasAttribute.entityId) {
                const entity = state.diagram.entities.find((e) => e.id === canvasAttribute.entityId);
                if (entity) {
                  const entityWarnings = validateEntity(entity, state.diagram);
                  entity.hasWarning = entityWarnings.length > 0;
                  entity.warnings = entityWarnings;
                }
              }
              if (canvasAttribute.relationshipId) {
                const relationship = state.diagram.relationships.find((r) => r.id === canvasAttribute.relationshipId);
                if (relationship) {
                  const relWarnings = validateRelationship(relationship, state.diagram);
                  relationship.hasWarning = relWarnings.length > 0;
                  relationship.warnings = relWarnings;
                }
              }
            }
          }
        });
      },

      deleteAttributeById: (attributeId) => {
        set((state) => {
          const canvasAttribute = state.diagram.attributes.find((a) => a.id === attributeId);
          if (canvasAttribute) {
            // Remove from parent entity
            if (canvasAttribute.entityId) {
              const entity = state.diagram.entities.find((e) => e.id === canvasAttribute.entityId);
              if (entity) {
                entity.attributes = entity.attributes.filter((a) => a.id !== attributeId);
              }
            }
            // Remove from parent relationship
            if (canvasAttribute.relationshipId) {
              const relationship = state.diagram.relationships.find((r) => r.id === canvasAttribute.relationshipId);
              if (relationship) {
                relationship.attributes = relationship.attributes.filter((a) => a.id !== attributeId);
              }
            }
          }
          // Remove from canvas attributes
          state.diagram.attributes = state.diagram.attributes.filter((a) => a.id !== attributeId);

          // Auto-validate parent if enabled
          if (state.validationEnabled && canvasAttribute) {
            if (canvasAttribute.entityId) {
              const entity = state.diagram.entities.find((e) => e.id === canvasAttribute.entityId);
              if (entity) {
                const warnings = validateEntity(entity, state.diagram);
                entity.hasWarning = warnings.length > 0;
                entity.warnings = warnings;
              }
            }
            if (canvasAttribute.relationshipId) {
              const relationship = state.diagram.relationships.find((r) => r.id === canvasAttribute.relationshipId);
              if (relationship) {
                const warnings = validateRelationship(relationship, state.diagram);
                relationship.hasWarning = warnings.length > 0;
                relationship.warnings = warnings;
              }
            }
          }
        });
      },

      // Relationship actions
      addRelationship: (position) => {
        set((state) => {
          const newRelationship: Relationship = {
            id: generateId(),
            type: 'relationship',
            name: `Relationship ${state.nextRelationshipNumber}`,
            position,
            selected: false,
            entityIds: [],
            attributes: [],
            cardinalities: {},
            participations: {},
            isWeak: false,
            size: { width: 120, height: 80 },
            rotation: 0,
          };
          state.diagram.relationships.push(newRelationship);
          state.nextRelationshipNumber += 1;

          // Auto-validate if enabled
          if (state.validationEnabled) {
            const warnings = validateRelationship(newRelationship, state.diagram);
            newRelationship.hasWarning = warnings.length > 0;
            newRelationship.warnings = warnings;
          }
        });
      },

      updateRelationship: (id, updates) => {
        set((state) => {
          const relationship = state.diagram.relationships.find((r) => r.id === id);
          if (relationship) {
            // Prevent duplicate names
            if (updates.name !== undefined && updates.name !== relationship.name) {
              if (!checkUniqueRelationshipName(id, updates.name, state.diagram)) {
                return; // Don't update if name is duplicate
              }
            }

            const positionChanged = updates.position && (
              updates.position.x !== relationship.position.x ||
              updates.position.y !== relationship.position.y
            );

            Object.assign(relationship, updates);

            // Auto-adjust connection points if position changed
            if (positionChanged) {
              updateConnectionPointsOnMove(state, id, relationship);
            }

            // Auto-validate if enabled
            if (state.validationEnabled) {
              const warnings = validateRelationship(relationship, state.diagram);
              relationship.hasWarning = warnings.length > 0;
              relationship.warnings = warnings;
            }
          }
        });
      },

      deleteRelationship: (id) => {
        set((state) => {
          state.diagram.relationships = state.diagram.relationships.filter(
            (r) => r.id !== id
          );
          state.diagram.connections = state.diagram.connections.filter(
            (c) => c.fromId !== id && c.toId !== id
          );
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);

          // Auto-validate affected entities if enabled
          if (state.validationEnabled) {
            // Find entities that were connected to this relationship
            const affectedEntityIds = new Set<string>();
            state.diagram.connections.forEach(conn => {
              if (conn.fromId === id) affectedEntityIds.add(conn.toId);
              if (conn.toId === id) affectedEntityIds.add(conn.fromId);
            });

            for (const entityId of affectedEntityIds) {
              const entity = state.diagram.entities.find(e => e.id === entityId);
              if (entity) {
                const warnings = validateEntity(entity, state.diagram);
                entity.hasWarning = warnings.length > 0;
                entity.warnings = warnings;
              }
            }
          }
        });
      },

      // Connection actions
      addConnection: (fromId, toId, fromPoint = 'right' as ConnectionPoint, toPoint = 'left' as ConnectionPoint, waypoints = [] as Position[], style = 'orthogonal' as ConnectionStyle) => {
        set((state) => {
          if (connectionExists(state.diagram, fromId, toId)) return;

          const fromElement = state.diagram.entities.find(e => e.id === fromId) ||
            state.diagram.relationships.find(r => r.id === fromId);
          const toElement = state.diagram.entities.find(e => e.id === toId) ||
            state.diagram.relationships.find(r => r.id === toId);

          if (!fromElement || !toElement) return;

          // Calculate initial connection points
          const fromPos = getConnectionPointPosition(fromElement, fromPoint);
          const toPos = getConnectionPointPosition(toElement, toPoint);

          // Build points array: from -> waypoints -> to
          const points: number[] = [fromPos.x, fromPos.y];
          waypoints.forEach(wp => {
            points.push(wp.x, wp.y);
          });
          points.push(toPos.x, toPos.y);

          const newConnection: Connection = {
            id: generateId(),
            type: 'connection',
            fromId,
            toId,
            fromPoint,
            toPoint,
            points,
            waypoints,
            style,
            cardinality: '1' as Cardinality,
            participation: 'partial' as Participation,
            position: { x: Math.min(fromPos.x, toPos.x), y: Math.min(fromPos.y, toPos.y) },
            selected: false,
          };
          state.diagram.connections.push(newConnection);

          // Update relationship entityIds if connecting entity to relationship
          if (fromElement.type === 'entity' && toElement.type === 'relationship') {
            if (!toElement.entityIds.includes(fromId)) {
              toElement.entityIds.push(fromId);
            }
          } else if (fromElement.type === 'relationship' && toElement.type === 'entity') {
            if (!fromElement.entityIds.includes(toId)) {
              fromElement.entityIds.push(toId);
            }
          }

          // Auto-validate if enabled
          if (state.validationEnabled) {
            // Validate connection
            validateConnection(newConnection, state.diagram);

            // Validate both connected elements
            if (fromElement.type === 'entity') {
              const warnings = validateEntity(fromElement, state.diagram);
              fromElement.hasWarning = warnings.length > 0;
              fromElement.warnings = warnings;
            } else if (fromElement.type === 'relationship') {
              const warnings = validateRelationship(fromElement, state.diagram);
              fromElement.hasWarning = warnings.length > 0;
              fromElement.warnings = warnings;
            }

            if (toElement.type === 'entity') {
              const warnings = validateEntity(toElement, state.diagram);
              toElement.hasWarning = warnings.length > 0;
              toElement.warnings = warnings;
            } else if (toElement.type === 'relationship') {
              const warnings = validateRelationship(toElement, state.diagram);
              toElement.hasWarning = warnings.length > 0;
              toElement.warnings = warnings;
            }
          }
        });
      },

      updateConnection: (id, updates) => {
        set((state) => {
          const connection = state.diagram.connections.find((c) => c.id === id);
          if (connection) {
            Object.assign(connection, updates);

            // Sync cardinality/participation to the relationship (for export and Relationship panel)
            if (updates.cardinality !== undefined || updates.participation !== undefined) {
              const rel = state.diagram.relationships.find(
                (r) => r.id === connection.fromId || r.id === connection.toId
              );
              const entityId =
                rel?.id === connection.fromId ? connection.toId : connection.fromId;
              if (rel && entityId) {
                if (updates.cardinality !== undefined) {
                  rel.cardinalities[entityId] = updates.cardinality;
                }
                if (updates.participation !== undefined) {
                  rel.participations[entityId] = updates.participation;
                }
              }
            }

            // Recalculate points if from/to elements or waypoints changed
            if (updates.fromPoint || updates.toPoint || updates.waypoints) {
              const fromElement = state.diagram.entities.find(e => e.id === connection.fromId) ||
                state.diagram.relationships.find(r => r.id === connection.fromId);
              const toElement = state.diagram.entities.find(e => e.id === connection.toId) ||
                state.diagram.relationships.find(r => r.id === connection.toId);

              if (fromElement && toElement) {
                const fromPos = getConnectionPointPosition(fromElement, connection.fromPoint);
                const toPos = getConnectionPointPosition(toElement, connection.toPoint);

                const points: number[] = [fromPos.x, fromPos.y];
                connection.waypoints.forEach(wp => {
                  points.push(wp.x, wp.y);
                });
                points.push(toPos.x, toPos.y);
                connection.points = points;
              }
            }

            // Auto-validate if enabled
            if (state.validationEnabled) {
              validateConnection(connection, state.diagram);
            }
          }
        });
      },

      deleteConnection: (id) => {
        set((state) => {
          const connection = state.diagram.connections.find(c => c.id === id);
          let fromElement: Entity | Relationship | undefined;
          let toElement: Entity | Relationship | undefined;

          if (connection) {
            // Remove from relationship entityIds
            fromElement = state.diagram.entities.find(e => e.id === connection.fromId) ||
              state.diagram.relationships.find(r => r.id === connection.fromId);
            toElement = state.diagram.entities.find(e => e.id === connection.toId) ||
              state.diagram.relationships.find(r => r.id === connection.toId);

            if (fromElement?.type === 'relationship' && toElement?.type === 'entity') {
              fromElement.entityIds = fromElement.entityIds.filter(eid => eid !== connection.toId);
            } else if (fromElement?.type === 'entity' && toElement?.type === 'relationship') {
              toElement.entityIds = toElement.entityIds.filter(eid => eid !== connection.fromId);
            }
          }

          state.diagram.connections = state.diagram.connections.filter(
            (c) => c.id !== id
          );
          state.selectedIds = state.selectedIds.filter(sid => sid !== id);

          // Auto-validate both connected elements if enabled
          if (state.validationEnabled && connection) {
            if (fromElement?.type === 'entity') {
              const warnings = validateEntity(fromElement, state.diagram);
              fromElement.hasWarning = warnings.length > 0;
              fromElement.warnings = warnings;
            } else if (fromElement?.type === 'relationship') {
              const warnings = validateRelationship(fromElement, state.diagram);
              fromElement.hasWarning = warnings.length > 0;
              fromElement.warnings = warnings;
            }

            if (toElement?.type === 'entity') {
              const warnings = validateEntity(toElement, state.diagram);
              toElement.hasWarning = warnings.length > 0;
              toElement.warnings = warnings;
            } else if (toElement?.type === 'relationship') {
              const warnings = validateRelationship(toElement, state.diagram);
              toElement.hasWarning = warnings.length > 0;
              toElement.warnings = warnings;
            }
          }
        });
      },

      addConnectionWaypoint: (connectionId, waypoint, index) => {
        set((state) => {
          const connection = state.diagram.connections.find((c) => c.id === connectionId);
          if (connection) {
            if (index !== undefined) {
              connection.waypoints.splice(index, 0, waypoint);
            } else {
              connection.waypoints.push(waypoint);
            }
            // Recalculate points
            const fromElement = state.diagram.entities.find(e => e.id === connection.fromId) ||
              state.diagram.relationships.find(r => r.id === connection.fromId);
            const toElement = state.diagram.entities.find(e => e.id === connection.toId) ||
              state.diagram.relationships.find(r => r.id === connection.toId);

            if (fromElement && toElement) {
              const fromPos = getConnectionPointPosition(fromElement, connection.fromPoint);
              const toPos = getConnectionPointPosition(toElement, connection.toPoint);

              const points: number[] = [fromPos.x, fromPos.y];
              connection.waypoints.forEach(wp => {
                points.push(wp.x, wp.y);
              });
              points.push(toPos.x, toPos.y);
              connection.points = points;
            }
          }
        });
      },

      removeConnectionWaypoint: (connectionId, waypointIndex) => {
        set((state) => {
          const connection = state.diagram.connections.find((c) => c.id === connectionId);
          if (connection && waypointIndex >= 0 && waypointIndex < connection.waypoints.length) {
            connection.waypoints.splice(waypointIndex, 1);
            // Recalculate points
            const fromElement = state.diagram.entities.find(e => e.id === connection.fromId) ||
              state.diagram.relationships.find(r => r.id === connection.fromId);
            const toElement = state.diagram.entities.find(e => e.id === connection.toId) ||
              state.diagram.relationships.find(r => r.id === connection.toId);

            if (fromElement && toElement) {
              const fromPos = getConnectionPointPosition(fromElement, connection.fromPoint);
              const toPos = getConnectionPointPosition(toElement, connection.toPoint);

              const points: number[] = [fromPos.x, fromPos.y];
              connection.waypoints.forEach(wp => {
                points.push(wp.x, wp.y);
              });
              points.push(toPos.x, toPos.y);
              connection.points = points;
            }
          }
        });
      },

      updateConnectionWaypoint: (connectionId, waypointIndex, position) => {
        set((state) => {
          const connection = state.diagram.connections.find((c) => c.id === connectionId);
          if (connection && waypointIndex >= 0 && waypointIndex < connection.waypoints.length) {
            connection.waypoints[waypointIndex] = position;
            // Recalculate points
            const fromElement = state.diagram.entities.find(e => e.id === connection.fromId) ||
              state.diagram.relationships.find(r => r.id === connection.fromId);
            const toElement = state.diagram.entities.find(e => e.id === connection.toId) ||
              state.diagram.relationships.find(r => r.id === connection.toId);

            if (fromElement && toElement) {
              const fromPos = getConnectionPointPosition(fromElement, connection.fromPoint);
              const toPos = getConnectionPointPosition(toElement, connection.toPoint);

              const points: number[] = [fromPos.x, fromPos.y];
              connection.waypoints.forEach(wp => {
                points.push(wp.x, wp.y);
              });
              points.push(toPos.x, toPos.y);
              connection.points = points;
            }
          }
        });
      },

      // Line actions
      addLine: (points: number[]) => {
        set((state) => {
          // Calculate bounding box from points to set correct position
          // points array: [x1, y1, x2, y2, ...]
          let minX = Infinity;
          let minY = Infinity;
          for (let i = 0; i < points.length; i += 2) {
            minX = Math.min(minX, points[i]);
            minY = Math.min(minY, points[i + 1]);
          }

          const newLine: LineShape = {
            id: generateId(),
            type: 'line',
            position: { x: minX, y: minY },
            selected: false,
            points,
            strokeWidth: 2,
          };
          state.diagram.lines.push(newLine);
        });
      },

      updateLine: (id: string, updates: Partial<LineShape>) => {
        set((state) => {
          const line = state.diagram.lines.find((l) => l.id === id);
          if (line) {
            Object.assign(line, updates);
          }
        });
      },

      deleteLine: (id: string) => {
        set((state) => {
          state.diagram.lines = state.diagram.lines.filter((l) => l.id !== id);
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        });
      },

      // Arrow actions
      addArrow: (type: 'arrow-left' | 'arrow-right', points: number[]) => {
        set((state) => {
          // Calculate bounding box from ORIGINAL points to set correct position
          // This ensures the position matches where the user actually drew
          let minX = Infinity;
          let minY = Infinity;
          for (let i = 0; i < points.length; i += 2) {
            minX = Math.min(minX, points[i]);
            minY = Math.min(minY, points[i + 1]);
          }

          // Konva Arrow always puts the arrowhead at the END of the points array
          // Points array is [x1, y1, x2, y2]
          // For arrow-left: arrowhead should point left (be at the leftmost X coordinate)
          // For arrow-right: arrowhead should point right (be at the rightmost X coordinate)
          let finalPoints: number[];
          const x1 = points[0];
          const x2 = points[2];

          if (type === 'arrow-left') {
            // Arrowhead should be at the leftmost point (smaller X)
            if (x1 < x2) {
              // x1 is leftmost, so put it at the end: [x2, y2, x1, y1]
              finalPoints = [points[2], points[3], points[0], points[1]];
            } else {
              // x2 is leftmost, so put it at the end: [x1, y1, x2, y2]
              finalPoints = points;
            }
          } else {
            // arrow-right: arrowhead should be at the rightmost point (larger X)
            if (x1 > x2) {
              // x1 is rightmost, so put it at the end: [x2, y2, x1, y1]
              finalPoints = [points[2], points[3], points[0], points[1]];
            } else {
              // x2 is rightmost, so put it at the end: [x1, y1, x2, y2]
              finalPoints = points;
            }
          }

          const newArrow: ArrowShape = {
            id: generateId(),
            type,
            position: { x: minX, y: minY },
            selected: false,
            points: finalPoints, // Store points with correct order for arrow direction
            strokeWidth: 2,
            pointerLength: 15,
            pointerWidth: 15,
          };
          state.diagram.arrows.push(newArrow);
        });
      },

      updateArrow: (id: string, updates: Partial<ArrowShape>) => {
        set((state) => {
          const arrow = state.diagram.arrows.find((a) => a.id === id);
          if (arrow) {
            Object.assign(arrow, updates);
          }
        });
      },

      deleteArrow: (id: string) => {
        set((state) => {
          state.diagram.arrows = state.diagram.arrows.filter((a) => a.id !== id);
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        });
      },

      // Selection actions
      selectElement: (id, multi = false) => {
        set((state) => {
          if (multi) {
            if (state.selectedIds.includes(id)) {
              state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
            } else {
              state.selectedIds.push(id);
            }
          } else {
            state.selectedIds = [id];
          }

          // Update selected flag on all elements
          state.diagram.entities.forEach((e) => {
            e.selected = state.selectedIds.includes(e.id);
          });
          state.diagram.relationships.forEach((r) => {
            r.selected = state.selectedIds.includes(r.id);
          });
          state.diagram.lines.forEach((l) => {
            l.selected = state.selectedIds.includes(l.id);
          });
          state.diagram.arrows.forEach((a) => {
            a.selected = state.selectedIds.includes(a.id);
          });
          state.diagram.attributes.forEach((a) => {
            a.selected = state.selectedIds.includes(a.id);
          });
          state.diagram.connections.forEach((c) => {
            c.selected = state.selectedIds.includes(c.id);
          });
          state.diagram.generalizations?.forEach((g) => {
            g.selected = state.selectedIds.includes(g.id);
          });
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selectedIds = [];
          state.diagram.entities.forEach((e) => (e.selected = false));
          state.diagram.relationships.forEach((r) => (r.selected = false));
          state.diagram.lines.forEach((l) => (l.selected = false));
          state.diagram.arrows.forEach((a) => (a.selected = false));
          state.diagram.attributes.forEach((a) => (a.selected = false));
          state.diagram.connections.forEach((c) => (c.selected = false));
          state.diagram.generalizations?.forEach((g) => (g.selected = false));
        });
      },

      selectMultiple: (ids) => {
        set((state) => {
          state.selectedIds = ids;
          state.diagram.entities.forEach((e) => {
            e.selected = ids.includes(e.id);
          });
          state.diagram.relationships.forEach((r) => {
            r.selected = ids.includes(r.id);
          });
          state.diagram.lines.forEach((l) => {
            l.selected = ids.includes(l.id);
          });
          state.diagram.arrows.forEach((a) => {
            a.selected = ids.includes(a.id);
          });
          state.diagram.attributes.forEach((a) => {
            a.selected = ids.includes(a.id);
          });
          state.diagram.connections.forEach((c) => {
            c.selected = ids.includes(c.id);
          });
          state.diagram.generalizations?.forEach((g) => {
            g.selected = ids.includes(g.id);
          });
        });
      },

      // Viewport actions
      setZoom: (scale) => {
        set((state) => {
          state.viewport.scale = Math.max(0.1, Math.min(3, scale));
        });
      },

      setViewportPosition: (position) => {
        set((state) => {
          state.viewport.position = position;
        });
      },

      // Mode actions
      setMode: (mode) => {
        set((state) => {
          state.mode = mode;
          // Reset drawing state when changing modes
          state.drawingLine = {
            isDrawing: false,
            startPoint: null,
            currentPoint: null,
          };
          state.drawingConnection = {
            isDrawing: false,
            fromId: null,
            fromPoint: null,
            currentPoint: null,
            waypoints: [],
          };
          state.pendingQuickRelationship = null;
          state.pendingGeneralizationConnect = null;
        });
      },

      // Exam mode and validation actions
      setExamMode: (enabled) => {
        set((state) => {
          state.examMode = enabled;
          // When exam mode is enabled, disable validation toggle (it will be disabled in UI)
          // Validation should remain as user set it, but toggle will be disabled
        });
      },

      setValidationEnabled: (enabled) => {
        set((state) => {
          state.validationEnabled = enabled;

          // If validation is being enabled, validate all existing elements
          if (enabled) {
            // Validate all entities
            for (const entity of state.diagram.entities) {
              const warnings = validateEntity(entity, state.diagram);
              entity.hasWarning = warnings.length > 0;
              entity.warnings = warnings;
            }

            // Validate all relationships
            for (const relationship of state.diagram.relationships) {
              const warnings = validateRelationship(relationship, state.diagram);
              relationship.hasWarning = warnings.length > 0;
              relationship.warnings = warnings;
            }

            // Validate all attributes
            for (const attribute of state.diagram.attributes) {
              const warnings = validateAttribute(attribute, state.diagram);
              attribute.hasWarning = warnings.length > 0;
              attribute.warnings = warnings;
            }

            // Validate all connections
            for (const connection of state.diagram.connections) {
              validateConnection(connection, state.diagram);
            }
          } else {
            // If validation is being disabled, clear all warnings
            for (const entity of state.diagram.entities) {
              entity.hasWarning = false;
              entity.warnings = [];
            }
            for (const relationship of state.diagram.relationships) {
              relationship.hasWarning = false;
              relationship.warnings = [];
            }
            for (const attribute of state.diagram.attributes) {
              attribute.hasWarning = false;
              attribute.warnings = [];
            }
          }
        });
      },

      validateElement: (id) => {
        set((state) => {
          if (!state.validationEnabled) return;

          const element = state.diagram.entities.find(e => e.id === id) ||
            state.diagram.relationships.find(r => r.id === id) ||
            state.diagram.attributes.find(a => a.id === id) ||
            state.diagram.connections.find(c => c.id === id);

          if (!element) return;

          let warnings: string[] = [];

          if (element.type === 'entity') {
            warnings = validateEntity(element, state.diagram);
            element.hasWarning = warnings.length > 0;
            element.warnings = warnings;
          } else if (element.type === 'relationship') {
            warnings = validateRelationship(element, state.diagram);
            element.hasWarning = warnings.length > 0;
            element.warnings = warnings;
          } else if (element.type === 'attribute') {
            warnings = validateAttribute(element, state.diagram);
            element.hasWarning = warnings.length > 0;
            element.warnings = warnings;
          } else if (element.type === 'connection') {
            warnings = validateConnection(element, state.diagram);
            // Connections don't have hasWarning/warnings fields, but we can still validate
          }
        });
      },

      validateAll: () => {
        set((state) => {
          if (!state.validationEnabled) return;

          // Validate all entities
          for (const entity of state.diagram.entities) {
            const warnings = validateEntity(entity, state.diagram);
            entity.hasWarning = warnings.length > 0;
            entity.warnings = warnings;
          }

          // Validate all relationships
          for (const relationship of state.diagram.relationships) {
            const warnings = validateRelationship(relationship, state.diagram);
            relationship.hasWarning = warnings.length > 0;
            relationship.warnings = warnings;
          }

          // Validate all attributes
          for (const attribute of state.diagram.attributes) {
            const warnings = validateAttribute(attribute, state.diagram);
            attribute.hasWarning = warnings.length > 0;
            attribute.warnings = warnings;
          }

          // Validate all connections (they don't have warning fields, but we validate for completeness)
          for (const connection of state.diagram.connections) {
            validateConnection(connection, state.diagram);
          }
        });
      },

      getValidationErrors: (): ValidationError[] => {
        const state = get();
        if (!state.validationEnabled) return [];
        return validateDiagram(state.diagram);
      },

      clearWarnings: (id) => {
        set((state) => {
          const element = state.diagram.entities.find(e => e.id === id) ||
            state.diagram.relationships.find(r => r.id === id) ||
            state.diagram.attributes.find(a => a.id === id);

          if (element && (element.type === 'entity' || element.type === 'relationship' || element.type === 'attribute')) {
            element.hasWarning = false;
            element.warnings = [];
          }
        });
      },

      // Drawing state actions
      setDrawingLine: (isDrawing: boolean, startPoint: Position | null = null, currentPoint: Position | null = null) => {
        set((state) => {
          state.drawingLine.isDrawing = isDrawing;
          if (startPoint !== undefined) state.drawingLine.startPoint = startPoint;
          if (currentPoint !== undefined) state.drawingLine.currentPoint = currentPoint;
        });
      },

      setDrawingConnection: (isDrawing: boolean, fromId: string | null = null, fromPoint: ConnectionPoint | null = null, currentPoint: Position | null = null, waypoints: Position[] = []) => {
        set((state) => {
          state.drawingConnection.isDrawing = isDrawing;
          if (fromId !== undefined) state.drawingConnection.fromId = fromId;
          if (fromPoint !== undefined) state.drawingConnection.fromPoint = fromPoint;
          if (currentPoint !== undefined) state.drawingConnection.currentPoint = currentPoint;
          if (waypoints !== undefined) state.drawingConnection.waypoints = waypoints;
        });
      },

      // Import/Export actions
      loadDiagram: (diagram: Diagram, replace: boolean) => {
        set((state) => {
          if (replace) {
            // Replace current diagram
            state.diagram = {
              entities: [...diagram.entities],
              relationships: [...diagram.relationships],
              connections: [...diagram.connections],
              generalizations: [...(diagram.generalizations ?? [])],
              lines: [...diagram.lines],
              arrows: [...diagram.arrows],
              attributes: [...diagram.attributes],
            };
            state.selectedIds = [];

            // Update counters based on loaded entities/relationships
            // Find the highest number in entity names
            const entityNumbers = diagram.entities
              .map(e => {
                const match = e.name.match(/Entity (\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              })
              .filter(n => n > 0);
            state.nextEntityNumber = entityNumbers.length > 0 ? Math.max(...entityNumbers) + 1 : 1;

            // Find the highest number in relationship names
            const relationshipNumbers = diagram.relationships
              .map(r => {
                const match = r.name.match(/Relationship (\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              })
              .filter(n => n > 0);
            state.nextRelationshipNumber = relationshipNumbers.length > 0 ? Math.max(...relationshipNumbers) + 1 : 1;
          } else {
            // Merge with existing diagram
            state.diagram.entities.push(...diagram.entities);
            state.diagram.relationships.push(...diagram.relationships);
            state.diagram.connections.push(...diagram.connections);
            state.diagram.generalizations.push(...(diagram.generalizations ?? []));
            state.diagram.lines.push(...diagram.lines);
            state.diagram.arrows.push(...diagram.arrows);
            state.diagram.attributes.push(...diagram.attributes);

            // Update counters for merged content too
            const allEntityNumbers = state.diagram.entities
              .map(e => {
                const match = e.name.match(/Entity (\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              })
              .filter(n => n > 0);
            state.nextEntityNumber = allEntityNumbers.length > 0 ? Math.max(...allEntityNumbers) + 1 : state.nextEntityNumber;

            const allRelationshipNumbers = state.diagram.relationships
              .map(r => {
                const match = r.name.match(/Relationship (\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              })
              .filter(n => n > 0);
            state.nextRelationshipNumber = allRelationshipNumbers.length > 0 ? Math.max(...allRelationshipNumbers) + 1 : state.nextRelationshipNumber;
          }

          // Auto-validate all elements if enabled
          if (state.validationEnabled) {
            // Validate all entities
            for (const entity of state.diagram.entities) {
              const warnings = validateEntity(entity, state.diagram);
              entity.hasWarning = warnings.length > 0;
              entity.warnings = warnings;
            }

            // Validate all relationships
            for (const relationship of state.diagram.relationships) {
              const warnings = validateRelationship(relationship, state.diagram);
              relationship.hasWarning = warnings.length > 0;
              relationship.warnings = warnings;
            }

            // Validate all attributes
            for (const attribute of state.diagram.attributes) {
              const warnings = validateAttribute(attribute, state.diagram);
              attribute.hasWarning = warnings.length > 0;
              attribute.warnings = warnings;
            }

            // Validate all connections (they don't have warning fields, but we validate for completeness)
            for (const connection of state.diagram.connections) {
              validateConnection(connection, state.diagram);
            }
          }
        });
      },

      setPendingQuickRelationship: (payload) => {
        set((state) => {
          state.pendingQuickRelationship = payload;
        });
      },

      addRelationshipBetweenEntities: (entityId1, entityId2, type) => {
        set((state) => {
          if (entityId1 === entityId2) return;
          const entity1 = state.diagram.entities.find((e) => e.id === entityId1);
          const entity2 = state.diagram.entities.find((e) => e.id === entityId2);
          if (!entity1 || !entity2) return;

          const card1: Cardinality = type === 'n-n' ? 'N' : '1';
          const card2: Cardinality = type === '1-1' ? '1' : 'N';

          const relWidth = 120;
          const relHeight = 80;
          const center1 = {
            x: entity1.position.x + entity1.size.width / 2,
            y: entity1.position.y + entity1.size.height / 2,
          };
          const center2 = {
            x: entity2.position.x + entity2.size.width / 2,
            y: entity2.position.y + entity2.size.height / 2,
          };
          const midX = (center1.x + center2.x) / 2;
          const midY = (center1.y + center2.y) / 2;

          // Count existing relationships between this entity pair to offset position
          const existingCount = state.diagram.relationships.filter(
            (r) => r.entityIds.includes(entityId1) && r.entityIds.includes(entityId2)
          ).length;
          // Offset perpendicular to the line between entities so they don't overlap
          const dx = center2.x - center1.x;
          const dy = center2.y - center1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const perpX = -dy / len;
          const perpY = dx / len;
          const offsetDistance = existingCount * 100;

          const relPosition: Position = {
            x: midX - relWidth / 2 + perpX * offsetDistance,
            y: midY - relHeight / 2 + perpY * offsetDistance,
          };

          const relId = generateId();
          const newRel: Relationship = {
            id: relId,
            type: 'relationship',
            name: `Relationship ${state.nextRelationshipNumber}`,
            position: relPosition,
            selected: false,
            entityIds: [entityId1, entityId2],
            attributes: [],
            cardinalities: { [entityId1]: card1, [entityId2]: card2 },
            participations: { [entityId1]: 'partial' as Participation, [entityId2]: 'partial' as Participation },
            isWeak: false,
            size: { width: relWidth, height: relHeight },
            rotation: 0,
          };
          state.diagram.relationships.push(newRel);
          state.nextRelationshipNumber += 1;

          const relAsElement = { ...newRel, position: relPosition, size: { width: relWidth, height: relHeight } };
          const relCenter = { x: midX, y: midY };

          const relEdge1 = getClosestEdge(center1, relAsElement) as ConnectionPoint;
          const relEdge2 = getClosestEdge(center2, relAsElement) as ConnectionPoint;
          const entity1Edge = getClosestEdge(relCenter, entity1) as ConnectionPoint;
          const entity2Edge = getClosestEdge(relCenter, entity2) as ConnectionPoint;

          const fromPos1 = getConnectionPointPosition(relAsElement, relEdge1);
          const toPos1 = getConnectionPointPosition(entity1, entity1Edge);
          const fromPos2 = getConnectionPointPosition(relAsElement, relEdge2);
          const toPos2 = getConnectionPointPosition(entity2, entity2Edge);

          const conn1: Connection = {
            id: generateId(),
            type: 'connection',
            fromId: relId,
            toId: entityId1,
            fromPoint: relEdge1,
            toPoint: entity1Edge,
            points: [fromPos1.x, fromPos1.y, toPos1.x, toPos1.y],
            waypoints: [],
            style: 'orthogonal',
            cardinality: card1,
            participation: 'partial',
            position: { x: Math.min(fromPos1.x, toPos1.x), y: Math.min(fromPos1.y, toPos1.y) },
            selected: false,
          };
          const conn2: Connection = {
            id: generateId(),
            type: 'connection',
            fromId: relId,
            toId: entityId2,
            fromPoint: relEdge2,
            toPoint: entity2Edge,
            points: [fromPos2.x, fromPos2.y, toPos2.x, toPos2.y],
            waypoints: [],
            style: 'orthogonal',
            cardinality: card2,
            participation: 'partial',
            position: { x: Math.min(fromPos2.x, toPos2.x), y: Math.min(fromPos2.y, toPos2.y) },
            selected: false,
          };
          state.diagram.connections.push(conn1, conn2);

          if (state.validationEnabled) {
            const warningsRel = validateRelationship(newRel, state.diagram);
            newRel.hasWarning = warningsRel.length > 0;
            newRel.warnings = warningsRel;
            validateConnection(conn1, state.diagram);
            validateConnection(conn2, state.diagram);
          }
        });
      },

      // Generalization actions
      addGeneralization: (parentId, childId, isTotal) => {
        set((state) => {
          const parent = state.diagram.entities.find((e) => e.id === parentId);
          const child = state.diagram.entities.find((e) => e.id === childId);
          if (!parent || !child || parentId === childId) return;

          const genWidth = 60;
          const genHeight = 40;
          const parentBottomY = parent.position.y + parent.size.height;
          const childTopY = child.position.y;
          const midX = (parent.position.x + parent.size.width / 2 + child.position.x + child.size.width / 2) / 2;
          const midY = (parentBottomY + childTopY) / 2;
          const genPosition: Position = {
            x: midX - genWidth / 2,
            y: midY - genHeight / 2,
          };

          const genId = generateId();
          const newGen: Generalization = {
            id: genId,
            type: 'generalization',
            position: genPosition,
            selected: false,
            parentId,
            childIds: [childId],
            isTotal,
            size: { width: genWidth, height: genHeight },
          };
          state.diagram.generalizations.push(newGen);
        });
      },

      updateGeneralization: (id, updates) => {
        set((state) => {
          const gen = state.diagram.generalizations.find((g) => g.id === id);
          if (gen) Object.assign(gen, updates);
        });
      },

      deleteGeneralization: (id) => {
        set((state) => {
          state.diagram.generalizations = state.diagram.generalizations.filter((g) => g.id !== id);
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        });
      },

      addChildToGeneralization: (generalizationId, childEntityId) => {
        set((state) => {
          const gen = state.diagram.generalizations.find((g) => g.id === generalizationId);
          if (!gen || gen.childIds.includes(childEntityId)) return;
          gen.childIds.push(childEntityId);
        });
      },

      setPendingQuickGeneralization: (payload) => {
        set((state) => {
          state.pendingQuickGeneralization = payload;
        });
      },

      addGeneralizationBetweenEntities: (childEntityId, parentEntityId, isTotal) => {
        set((state) => {
          if (childEntityId === parentEntityId) return;
          const parent = state.diagram.entities.find((e) => e.id === parentEntityId);
          const child = state.diagram.entities.find((e) => e.id === childEntityId);
          if (!parent || !child) return;

          const genWidth = 60;
          const genHeight = 40;
          const parentBottomY = parent.position.y + parent.size.height;
          const childTopY = child.position.y;
          const midX = (parent.position.x + parent.size.width / 2 + child.position.x + child.size.width / 2) / 2;
          const midY = (parentBottomY + childTopY) / 2;
          const genPosition: Position = {
            x: midX - genWidth / 2,
            y: midY - genHeight / 2,
          };

          const genId = generateId();
          const newGen: Generalization = {
            id: genId,
            type: 'generalization',
            position: genPosition,
            selected: false,
            parentId: parentEntityId,
            childIds: [childEntityId],
            isTotal,
            size: { width: genWidth, height: genHeight },
          };
          state.diagram.generalizations.push(newGen);
        });
      },

      setPendingGeneralizationConnect: (generalizationId) => {
        set((state) => {
          state.pendingGeneralizationConnect = generalizationId;
        });
      },

      // Utility
      getElementById: (id: string): Entity | Relationship | LineShape | ArrowShape | Attribute | Connection | Generalization | undefined => {
        const state = get();
        return (
          state.diagram.entities.find((e) => e.id === id) ||
          state.diagram.relationships.find((r) => r.id === id) ||
          state.diagram.lines.find((l) => l.id === id) ||
          state.diagram.arrows.find((a) => a.id === id) ||
          state.diagram.attributes.find((a) => a.id === id) ||
          state.diagram.connections.find((c) => c.id === id) ||
          state.diagram.generalizations.find((g) => g.id === id) ||
          undefined
        );
      },

      getConnectionPoints: (elementId: string): Position[] => {
        const state = get();
        const element = state.diagram.entities.find((e) => e.id === elementId) ||
          state.diagram.relationships.find((r) => r.id === elementId);

        if (!element) return [];

        return [
          getConnectionPointPosition(element, 'top'),
          getConnectionPointPosition(element, 'right'),
          getConnectionPointPosition(element, 'bottom'),
          getConnectionPointPosition(element, 'left'),
        ];
      },
    })),
    {
      partialize: (state) => ({
        diagram: state.diagram,
      }),
      limit: 50,
    }
  )
);

// Undo/Redo hooks
export const useUndo = () => useEditorStore.temporal.getState().undo;
export const useRedo = () => useEditorStore.temporal.getState().redo;
export const useCanUndo = () => useEditorStore.temporal.getState().pastStates.length > 0;
export const useCanRedo = () => useEditorStore.temporal.getState().futureStates.length > 0;