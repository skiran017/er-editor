import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import type { Entity, Relationship, Connection, EditorState, Position, LineShape, ArrowShape } from '../types';

interface EditorStore extends EditorState {
  // Entity actions
  addEntity: (position: Position) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;

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
  addConnection: (fromId: string, toId: string) => void;
  updateConnection: (id: string, points: number[]) => void;
  deleteConnection: (id: string) => void;

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

  // Utility
  getElementById: (id: string) => Entity | Relationship | LineShape | ArrowShape | undefined;
}

// Helper function to generate IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
            Object.assign(entity, updates);
          }
        });
      },

      deleteEntity: (id) => {
        set((state) => {
          // Remove entity
          state.diagram.entities = state.diagram.entities.filter((e) => e.id !== id);

          // Remove associated connections
          state.diagram.connections = state.diagram.connections.filter(
            (c) => c.fromId !== id && c.toId !== id
          );

          // Remove from selection
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
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
            cardinalities: {},
            participations: {},
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
            Object.assign(relationship, updates);
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
      addConnection: (fromId, toId) => {
        set((state) => {
          const newConnection: Connection = {
            id: generateId(),
            fromId,
            toId,
            points: [], // Will be calculated based on element positions
          };
          state.diagram.connections.push(newConnection);
        });
      },

      updateConnection: (id, points) => {
        set((state) => {
          const connection = state.diagram.connections.find((c) => c.id === id);
          if (connection) {
            connection.points = points;
          }
        });
      },

      deleteConnection: (id) => {
        set((state) => {
          state.diagram.connections = state.diagram.connections.filter(
            (c) => c.id !== id
          );
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
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selectedIds = [];
          state.diagram.entities.forEach((e) => (e.selected = false));
          state.diagram.relationships.forEach((r) => (r.selected = false));
          state.diagram.lines.forEach((l) => (l.selected = false));
          state.diagram.arrows.forEach((a) => (a.selected = false));
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

      // Utility
      // Utility
      getElementById: (id: string): Entity | Relationship | LineShape | ArrowShape | undefined => {
        const state = get();
        return (
          state.diagram.entities.find((e) => e.id === id) ||
          state.diagram.relationships.find((r) => r.id === id) ||
          state.diagram.lines.find((l) => l.id === id) ||
          state.diagram.arrows.find((a) => a.id === id)
        );
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