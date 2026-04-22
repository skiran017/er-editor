import { assign, setup } from 'xstate'
import {
  beginRubberband, clearSelectionAction, commitRubberbandAction,
  connectNodes, deleteSelectionAction, duplicateSelectionAction, moveDraggedNode,
  nudgeSelection, panViewportAction, placeNode, redoAction, selectAllAction,
  selectNodeFromEvent, stubCopy, stubCut, stubPaste, toggleCheatsheetAction,
  undoAction, updateRubberbandAction, zoomAtPointAction,
} from './actions'
import { initialContext, type EditorContext } from './context'
import type { EditorEvent, Tool } from './events'

const DRAG_THRESHOLD_PX = 3

export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },
  guards: {
    isSelectTool: ({ context }) => context.tool === 'select',
    isPanTool: ({ context }) => context.tool === 'pan',
    isPlaceEntityTool: ({ context }) => context.tool === 'entity',
    isPlaceRelationshipTool: ({ context }) => context.tool === 'relationship',
    isPlaceAttributeTool: ({ context }) => context.tool === 'attribute',
    isPlaceIsaTool: ({ context }) => context.tool === 'isa',
    isConnectTool: ({ context }) => context.tool === 'connect',
    isQuickRelationshipTool: ({ context }) => context.tool === 'quickRelationship',
    isQuickGeneralizationTool: ({ context }) => context.tool === 'quickGeneralization',
    crossedDragThreshold: ({ context, event }) => {
      if (event.type !== 'CANVAS_POINTER_MOVE' && event.type !== 'NODE_POINTER_DOWN') return false
      const origin = context.dragOriginPoint
      if (!origin) return false
      const point = 'point' in event ? event.point : null
      if (!point) return false
      const dx = point.x - origin.x
      const dy = point.y - origin.y
      return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
    },
    isLeftButton: ({ event }) =>
      (event.type === 'CANVAS_POINTER_DOWN' || event.type === 'NODE_POINTER_DOWN' || event.type === 'EDGE_POINTER_DOWN')
      && event.button === 'left',
    isMiddleOrRightButton: ({ event }) =>
      (event.type === 'CANVAS_POINTER_DOWN' || event.type === 'NODE_POINTER_DOWN' || event.type === 'EDGE_POINTER_DOWN')
      && (event.button === 'middle' || event.button === 'right'),
  },
  actions: {
    setTool: assign({
      tool: ({ event }) =>
        event.type === 'PICK_TOOL' ? event.tool : 'select' as Tool,
    }),
    resetContext: assign({
      draggedNodeId: null,
      dragOriginPoint: null,
      connectionFromId: null,
      quickFirstId: null,
      resizeNodeId: null,
      resizeHandle: null,
    }),
    beginDrag: assign({
      draggedNodeId: ({ event }) =>
        event.type === 'NODE_POINTER_DOWN' ? event.nodeId : null,
      dragOriginPoint: ({ event }) =>
        event.type === 'NODE_POINTER_DOWN' ? event.point : null,
    }),
    beginPan: assign({
      dragOriginPoint: ({ event }) =>
        (event.type === 'CANVAS_POINTER_DOWN' || event.type === 'NODE_POINTER_DOWN')
          ? event.point : null,
    }),
    beginResize: assign({
      resizeNodeId: ({ event }) =>
        event.type === 'RESIZE_HANDLE_POINTER_DOWN' ? event.nodeId : null,
      resizeHandle: ({ event }) =>
        event.type === 'RESIZE_HANDLE_POINTER_DOWN' ? event.handle : null,
    }),
    // Side-effect actions below delegate to action-module functions.
    selectNodeFromEvent: ({ context, event }) => selectNodeFromEvent(context, event),
    moveDraggedNode: ({ context, event }) => moveDraggedNode(context, event),
    beginRubberband: ({ context, event }) => beginRubberband(context, event),
    updateRubberbandAction: ({ context, event }) => updateRubberbandAction(context, event),
    commitRubberbandAction: ({ context, event }) => commitRubberbandAction(context, event),
    panViewportAction: ({ context, event }) => panViewportAction(context, event),
    zoomAtPointAction: ({ context, event }) => zoomAtPointAction(context, event),
    nudgeSelection: ({ context, event }) => nudgeSelection(context, event),
    undoAction: ({ context, event }) => undoAction(context, event),
    redoAction: ({ context, event }) => redoAction(context, event),
    deleteSelectionAction: ({ context, event }) => deleteSelectionAction(context, event),
    duplicateSelectionAction: ({ context, event }) => duplicateSelectionAction(context, event),
    selectAllAction: ({ context, event }) => selectAllAction(context, event),
    clearSelectionAction: ({ context, event }) => clearSelectionAction(context, event),
    stubCopy: ({ context, event }) => stubCopy(context, event),
    stubCut: ({ context, event }) => stubCut(context, event),
    stubPaste: ({ context, event }) => stubPaste(context, event),
    toggleCheatsheetAction: ({ context, event }) => toggleCheatsheetAction(context, event),
    placeNodeAction: ({ context, event }) => placeNode(context, event),
    connectNodesAction: ({ context, event }) => connectNodes(context, event),
  },
}).createMachine({
  id: 'editor',
  context: initialContext,
  initial: 'selecting',
  on: {
    PICK_TOOL: [
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'select',
        target: '.selecting', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'pan',
        target: '.panning', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'entity',
        target: '.placing.entity', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'relationship',
        target: '.placing.relationship', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'attribute',
        target: '.placing.attribute', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'isa',
        target: '.placing.isa', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'connect',
        target: '.drawing', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'quickRelationship',
        target: '.quickRelationship', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'quickGeneralization',
        target: '.quickGeneralization', actions: ['setTool', 'resetContext'] },
    ],
    ESCAPE: { target: '.selecting', actions: ['resetContext', 'clearSelectionAction'] },
    UNDO: { actions: 'undoAction' },
    REDO: { actions: 'redoAction' },
    DELETE: { actions: 'deleteSelectionAction' },
    DUPLICATE: { actions: 'duplicateSelectionAction' },
    SELECT_ALL: { actions: 'selectAllAction' },
    NUDGE: { actions: 'nudgeSelection' },
    WHEEL_ZOOM: { actions: 'zoomAtPointAction' },
    COPY: { actions: 'stubCopy' },
    CUT: { actions: 'stubCut' },
    PASTE: { actions: 'stubPaste' },
    TOGGLE_CHEATSHEET: { actions: 'toggleCheatsheetAction' },
  },
  states: {
    selecting: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            CANVAS_POINTER_DOWN: [
              { guard: 'isMiddleOrRightButton', target: '#editor.panning',
                actions: 'beginPan' },
              { guard: 'isLeftButton', target: 'rubberBand',
                actions: 'beginRubberband' },
            ],
            NODE_POINTER_DOWN: [
              { guard: 'isLeftButton', target: 'maybeDragging',
                actions: ['selectNodeFromEvent', 'beginDrag'] },
            ],
            RESIZE_HANDLE_POINTER_DOWN: { target: 'resizing', actions: 'beginResize' },
          },
        },
        rubberBand: {
          on: {
            CANVAS_POINTER_MOVE: { actions: 'updateRubberbandAction' },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'commitRubberbandAction' },
          },
        },
        maybeDragging: {
          on: {
            CANVAS_POINTER_MOVE: {
              guard: 'crossedDragThreshold',
              target: 'dragging',
            },
            NODE_POINTER_UP: { target: 'idle', actions: 'resetContext' },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'resetContext' },
          },
        },
        dragging: {
          on: {
            CANVAS_POINTER_MOVE: { actions: 'moveDraggedNode' },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'resetContext' },
            NODE_POINTER_UP: { target: 'idle', actions: 'resetContext' },
          },
        },
        resizing: {
          on: {
            CANVAS_POINTER_MOVE: {
              // Resize logic stays in an action function so it can grow without crowding the machine.
              // Phase 4 adds snap + constraint logic; for now, resize is a no-op action.
            },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'resetContext' },
          },
        },
      },
    },
    // Phase 5 adds: panning (Task 6), placing (Task 6), drawing (Task 7),
    // quickRelationship (Task 7), quickGeneralization (Task 7),
    // connectToGeneralization (Task 7).
    panning: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            CANVAS_POINTER_DOWN: { target: 'active', actions: 'beginPan' },
          },
        },
        active: {
          on: {
            CANVAS_POINTER_MOVE: { actions: 'panViewportAction' },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'resetContext' },
          },
        },
      },
    },
    placing: {
      initial: 'entity',
      states: {
        entity: {
          on: { CANVAS_POINTER_UP: { actions: 'placeNodeAction' } },
        },
        relationship: {
          on: { CANVAS_POINTER_UP: { actions: 'placeNodeAction' } },
        },
        attribute: {
          on: { CANVAS_POINTER_UP: { actions: 'placeNodeAction' } },
        },
        isa: {
          on: { CANVAS_POINTER_UP: { actions: 'placeNodeAction' } },
        },
      },
    },
    drawing: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            NODE_POINTER_DOWN: [
              { guard: 'isLeftButton', target: 'connection.fromPicked',
                actions: assign({
                  connectionFromId: ({ event }) =>
                    event.type === 'NODE_POINTER_DOWN' ? event.nodeId : null,
                }) },
            ],
          },
        },
        connection: {
          initial: 'fromPicked',
          states: {
            fromPicked: {
              on: {
                NODE_POINTER_UP: {
                  target: '#editor.drawing.idle',
                  actions: ['connectNodesAction', 'resetContext'],
                },
                CANVAS_POINTER_UP: { target: '#editor.drawing.idle', actions: 'resetContext' },
              },
            },
          },
        },
      },
    },
    quickRelationship: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            NODE_POINTER_DOWN: {
              guard: 'isLeftButton',
              target: 'firstPicked',
              actions: assign({
                quickFirstId: ({ event }) =>
                  event.type === 'NODE_POINTER_DOWN' ? event.nodeId : null,
              }),
            },
          },
        },
        firstPicked: {
          on: {
            NODE_POINTER_DOWN: {
              guard: ({ context, event }) =>
                event.type === 'NODE_POINTER_DOWN' && event.button === 'left'
                  && context.quickFirstId !== null && event.nodeId !== context.quickFirstId,
              target: '#editor.quickRelationship.idle',
              actions: ['connectNodesAction', 'resetContext'],
            },
          },
        },
      },
    },
    quickGeneralization: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            NODE_POINTER_DOWN: {
              guard: 'isLeftButton',
              target: 'firstPicked',
              actions: assign({
                quickFirstId: ({ event }) =>
                  event.type === 'NODE_POINTER_DOWN' ? event.nodeId : null,
              }),
            },
          },
        },
        firstPicked: {
          on: {
            NODE_POINTER_DOWN: {
              guard: ({ context, event }) =>
                event.type === 'NODE_POINTER_DOWN' && event.button === 'left'
                  && context.quickFirstId !== null && event.nodeId !== context.quickFirstId,
              target: '#editor.quickGeneralization.idle',
              actions: ['connectNodesAction', 'resetContext'],
            },
          },
        },
      },
    },
    connectToGeneralization: {
      initial: 'waitingForChild',
      states: {
        waitingForChild: {
          on: {
            NODE_POINTER_DOWN: {
              guard: 'isLeftButton',
              target: '#editor.selecting',
              actions: ['connectNodesAction', 'resetContext'],
            },
          },
        },
      },
    },
  },
})
