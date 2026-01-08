import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import type { Entity, Relationship, Connection, EditorState, Position, LineShape, ArrowShape, Attribute, EntityAttribute, ConnectionPoint, ConnectionStyle, Cardinality, Participation, Diagram } from '../types';
import { getClosestEdge } from '../lib/utils';

interface EditorStore extends EditorState {
  // Entity actions
  addEntity: (position: Position) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;

  // Attribute actions
  addAttribute: (entityId: string, attribute: Omit<EntityAttribute, 'id'>) => void;
  addRelationshipAttribute: (relationshipId: string, attribute: Omit<EntityAttribute, 'id'>) => void;
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

  // Drawing state actions
  setDrawingLine: (isDrawing: boolean, startPoint?: Position | null, currentPoint?: Position | null) => void;
  setDrawingConnection: (isDrawing: boolean, fromId?: string | null, fromPoint?: ConnectionPoint | null, currentPoint?: Position | null, waypoints?: Position[]) => void;

  // Import/Export actions
  loadDiagram: (diagram: Diagram, replace: boolean) => void;

  // Utility
  getElementById: (id: string) => Entity | Relationship | LineShape | ArrowShape | Attribute | Connection | undefined;
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
    // getClosestEdge(point, element) returns which edge of element is closest to point
    let newFromPoint: ConnectionPoint;
    let newToPoint: ConnectionPoint;

    if (connection.fromId === movedElementId) {
      // Moved element is the source (fromId)
      // Find which edge of movedElement is closest to otherElement's center
      newFromPoint = getClosestEdge(otherCenter, {
        position: movedElement.position,
        size: movedElement.size,
      }) as ConnectionPoint;
      // Find which edge of otherElement is closest to movedElement's center
      newToPoint = getClosestEdge(movedCenter, {
        position: otherElement.position,
        size: otherElement.size,
      }) as ConnectionPoint;
    } else {
      // Moved element is the target (toId)
      // Find which edge of otherElement is closest to movedElement's center
      newFromPoint = getClosestEdge(movedCenter, {
        position: otherElement.position,
        size: otherElement.size,
      }) as ConnectionPoint;
      // Find which edge of movedElement is closest to otherElement's center
      newToPoint = getClosestEdge(otherCenter, {
        position: movedElement.position,
        size: movedElement.size,
      }) as ConnectionPoint;
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

      // Entity actions
      addEntity: (position) => {
        set((state) => {
          const newEntity: Entity = {
            id: generateId(),
            type: 'entity',
            name: 'New Entity',
            position,
            selected: false,
            attributes: [],
            isWeak: false,
            size: { width: 150, height: 80 },
            rotation: 0,
          };
          state.diagram.entities.push(newEntity);
        });
      },

      updateEntity: (id, updates) => {
        set((state) => {
          const entity = state.diagram.entities.find((e) => e.id === id);
          if (entity) {
            const positionChanged = updates.position && (
              updates.position.x !== entity.position.x ||
              updates.position.y !== entity.position.y
            );

            Object.assign(entity, updates);

            // Auto-adjust connection points if position changed
            if (positionChanged) {
              updateConnectionPointsOnMove(state, id, entity);
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

          // Remove from selection
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        });
      },

      // Attribute actions
      addAttribute: (entityId, attribute) => {
        set((state) => {
          const entity = state.diagram.entities.find((e) => e.id === entityId);
          if (entity) {
            const attributeId = generateId();
            // Calculate position relative to entity (to the right side)
            const attributeCount = state.diagram.attributes.filter(a => a.entityId === entityId).length;
            const newAttribute: Attribute = {
              id: attributeId,
              type: 'attribute',
              ...attribute,
              entityId,
              position: {
                x: entity.position.x + entity.size.width + 40,
                y: entity.position.y + 20 + attributeCount * 30,
              },
              selected: false,
            };
            // Add to both entity's attributes array and diagram's attributes array
            entity.attributes.push({
              id: attributeId,
              name: attribute.name,
              isKey: attribute.isKey,
              isPartialKey: attribute.isPartialKey || false,
              isMultivalued: attribute.isMultivalued,
              isDerived: attribute.isDerived,
            });
            state.diagram.attributes.push(newAttribute);
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
            if (updates.isPartialKey !== undefined) canvasAttribute.isPartialKey = updates.isPartialKey;
            if (updates.isMultivalued !== undefined) canvasAttribute.isMultivalued = updates.isMultivalued;
            if (updates.isDerived !== undefined) canvasAttribute.isDerived = updates.isDerived;
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
        });
      },

      // Attribute position actions
      updateAttributePosition: (attributeId: string, position: Position) => {
        set((state) => {
          const attribute = state.diagram.attributes.find((a) => a.id === attributeId);
          if (attribute) {
            const positionChanged = (
              position.x !== attribute.position.x ||
              position.y !== attribute.position.y
            );

            attribute.position = position;

            // Note: Attributes use lines (not connections) that are calculated dynamically in AttributeShape
            // The line automatically updates when attribute or parent position changes
            // No explicit connection point adjustment needed for attributes
          }
        });
      },

      addRelationshipAttribute: (relationshipId, attribute) => {
        set((state) => {
          const relationship = state.diagram.relationships.find((r) => r.id === relationshipId);
          if (relationship) {
            const attributeId = generateId();
            // Calculate position relative to relationship (to the right side)
            const attributeCount = state.diagram.attributes.filter(a => a.relationshipId === relationshipId).length;
            const newAttribute: Attribute = {
              id: attributeId,
              type: 'attribute',
              ...attribute,
              relationshipId,
              position: {
                x: relationship.position.x + relationship.size.width + 40,
                y: relationship.position.y + 20 + attributeCount * 30,
              },
              selected: false,
            };
            // Add to both relationship's attributes array and diagram's attributes array
            relationship.attributes.push({
              id: attributeId,
              name: attribute.name,
              isKey: attribute.isKey,
              isPartialKey: attribute.isPartialKey || false,
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
            Object.assign(canvasAttribute, updates);
            // Also update in parent entity or relationship
            if (canvasAttribute.entityId) {
              const entity = state.diagram.entities.find((e) => e.id === canvasAttribute.entityId);
              if (entity) {
                const attribute = entity.attributes.find((a) => a.id === attributeId);
                if (attribute) {
                  if (updates.name !== undefined) attribute.name = updates.name;
                  if (updates.isKey !== undefined) attribute.isKey = updates.isKey;
                  if (updates.isPartialKey !== undefined) attribute.isPartialKey = updates.isPartialKey;
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
                  if (updates.isPartialKey !== undefined) attribute.isPartialKey = updates.isPartialKey;
                  if (updates.isMultivalued !== undefined) attribute.isMultivalued = updates.isMultivalued;
                  if (updates.isDerived !== undefined) attribute.isDerived = updates.isDerived;
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
        });
      },

      // Relationship actions
      addRelationship: (position) => {
        set((state) => {
          const newRelationship: Relationship = {
            id: generateId(),
            type: 'relationship',
            name: 'New Relationship',
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
        });
      },

      updateRelationship: (id, updates) => {
        set((state) => {
          const relationship = state.diagram.relationships.find((r) => r.id === id);
          if (relationship) {
            const positionChanged = updates.position && (
              updates.position.x !== relationship.position.x ||
              updates.position.y !== relationship.position.y
            );

            Object.assign(relationship, updates);

            // Auto-adjust connection points if position changed
            if (positionChanged) {
              updateConnectionPointsOnMove(state, id, relationship);
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
        });
      },

      // Connection actions
      addConnection: (fromId, toId, fromPoint = 'right' as ConnectionPoint, toPoint = 'left' as ConnectionPoint, waypoints = [] as Position[], style = 'straight' as ConnectionStyle) => {
        set((state) => {
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
        });
      },

      updateConnection: (id, updates) => {
        set((state) => {
          const connection = state.diagram.connections.find((c) => c.id === id);
          if (connection) {
            Object.assign(connection, updates);
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
          }
        });
      },

      deleteConnection: (id) => {
        set((state) => {
          const connection = state.diagram.connections.find(c => c.id === id);
          if (connection) {
            // Remove from relationship entityIds
            const fromElement = state.diagram.entities.find(e => e.id === connection.fromId) ||
              state.diagram.relationships.find(r => r.id === connection.fromId);
            const toElement = state.diagram.entities.find(e => e.id === connection.toId) ||
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
              lines: [...diagram.lines],
              arrows: [...diagram.arrows],
              attributes: [...diagram.attributes],
            };
            state.selectedIds = [];
          } else {
            // Merge with existing diagram
            state.diagram.entities.push(...diagram.entities);
            state.diagram.relationships.push(...diagram.relationships);
            state.diagram.connections.push(...diagram.connections);
            state.diagram.lines.push(...diagram.lines);
            state.diagram.arrows.push(...diagram.arrows);
            state.diagram.attributes.push(...diagram.attributes);
          }
        });
      },

      // Utility
      getElementById: (id: string): Entity | Relationship | LineShape | ArrowShape | Attribute | Connection | undefined => {
        const state = get();
        return (
          state.diagram.entities.find((e) => e.id === id) ||
          state.diagram.relationships.find((r) => r.id === id) ||
          state.diagram.lines.find((l) => l.id === id) ||
          state.diagram.arrows.find((a) => a.id === id) ||
          state.diagram.attributes.find((a) => a.id === id) ||
          state.diagram.connections.find((c) => c.id === id) ||
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