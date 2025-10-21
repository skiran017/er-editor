// src/store/editorStore.ts

import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import type { Entity, Relationship, Connection, EditorState, Position } from '../types';

interface EditorStore extends EditorState {
  // Entity actions
  addEntity: (position: Position) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;

  // Relationship actions
  addRelationship: (position: Position) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;

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

  // Utility
  getElementById: (id: string) => Entity | Relationship | undefined;
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
            size: { width: 100, height: 60 },
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

          // Update selected flag on elements
          state.diagram.entities.forEach((e) => {
            e.selected = state.selectedIds.includes(e.id);
          });
          state.diagram.relationships.forEach((r) => {
            r.selected = state.selectedIds.includes(r.id);
          });
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selectedIds = [];
          state.diagram.entities.forEach((e) => (e.selected = false));
          state.diagram.relationships.forEach((r) => (r.selected = false));
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
        });
      },

      // Utility
      getElementById: (id) => {
        const state = get();
        return (
          state.diagram.entities.find((e) => e.id === id) ||
          state.diagram.relationships.find((r) => r.id === id)
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