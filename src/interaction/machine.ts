import { assign, setup } from 'xstate'
import {
  beginRenameSelected, beginRubberband, clearSelectionAction, commitRubberbandAction,
  connectChildToIsaAction, connectNodes, deleteSelectionAction,
  duplicateSelectionAction, fitAction, moveDraggedNode, nudgeSelection,
  panViewportAction, placeAttributeOnParent, placeNode, redoAction,
  rejectOrphanAttributeToast, selectAllAction, selectEdgeFromEvent, selectNodeFromEvent,
  stubCopy, stubCut, stubPaste, toggleCheatsheetAction, undoAction,
  updateRubberbandAction, zoomAtPointAction, zoomInAction, zoomOutAction,
  toastConnectPickSource, toastConnectPickTarget,
  toastQuickRelPickFirst, toastQuickRelPickSecond,
  toastQuickGenPickParent, toastQuickGenPickChild,
  toastAddChildToIsa, clearFlowToast,
} from './actions'
import { useDiagramStore } from '@/state/diagramStore'
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
    isQuickRelationshipTool: ({ context }) =>
      context.tool === 'quickRelationship11'
      || context.tool === 'quickRelationship1N'
      || context.tool === 'quickRelationshipNN',
    isQuickGeneralizationTool: ({ context }) =>
      context.tool === 'quickGeneralization'
      || context.tool === 'quickGeneralizationTotal',
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
    // Chen semantics: attributes may only hang off an entity, a relationship,
    // or another (composite) attribute — NOT an ISA and NOT the canvas.
    canHostAttribute: ({ event }) => {
      if (event.type !== 'NODE_POINTER_DOWN') return false
      const node = useDiagramStore.getState().diagram.nodesById[event.nodeId]
      if (!node) return false
      return node.kind === 'entity' || node.kind === 'relationship' || node.kind === 'attribute'
    },
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
    beginConnectChildToIsa: assign({
      connectionFromId: ({ event }) =>
        event.type === 'CONNECT_CHILD_TO_ISA' ? event.isaId : null,
    }),
    // Side-effect actions below delegate to action-module functions.
    selectNodeFromEvent: ({ context, event }) => selectNodeFromEvent(context, event),
    selectEdgeFromEvent: ({ context, event }) => selectEdgeFromEvent(context, event),
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
    placeAttributeOnParentAction: ({ event }) => placeAttributeOnParent(event),
    rejectOrphanAttributeToast: ({ event }) => rejectOrphanAttributeToast(event),
    connectNodesAction: ({ context, event }) => connectNodes(context, event),
    connectChildToIsaAction: ({ context, event }) => connectChildToIsaAction(context, event),
    zoomIn: ({ context, event }) => zoomInAction(context, event),
    zoomOut: ({ context, event }) => zoomOutAction(context, event),
    fit: ({ context, event }) => fitAction(context, event),
    beginRenameSelected: () => beginRenameSelected(),
    // Flow-hint toasts (entry / exit of multi-step tools).
    //
    // The "pick first / source / parent" toasts are gated against
    // NODE_POINTER_DOWN re-entries. After a user completes a connection,
    // the FSM returns to its tool's `idle` state — re-firing the
    // "pick first" hint there read as "the state reset itself" and
    // confused users. The success transition runs `clearFlowToast` so
    // the "pick second / target / child" hint doesn't linger; on cancel
    // paths (PICK_TOOL, PANE_CLICK, ESCAPE) the hint still re-shows.
    toastConnectPickSource: ({ event }) => {
      if (event.type === 'NODE_POINTER_DOWN' || event.type === 'NODE_POINTER_UP') return
      toastConnectPickSource()
    },
    toastConnectPickTarget: () => toastConnectPickTarget(),
    toastQuickRelPickFirst: ({ event }) => {
      if (event.type === 'NODE_POINTER_DOWN') return
      toastQuickRelPickFirst()
    },
    toastQuickRelPickSecond: () => toastQuickRelPickSecond(),
    toastQuickGenPickParent: ({ event }) => {
      if (event.type === 'NODE_POINTER_DOWN') return
      toastQuickGenPickParent()
    },
    toastQuickGenPickChild: () => toastQuickGenPickChild(),
    toastAddChildToIsa: () => toastAddChildToIsa(),
    clearFlowToast: () => clearFlowToast(),
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
      { guard: ({ event }) =>
          event.type === 'PICK_TOOL'
          && (event.tool === 'quickRelationship11'
              || event.tool === 'quickRelationship1N'
              || event.tool === 'quickRelationshipNN'),
        target: '.quickRelationship', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) =>
          event.type === 'PICK_TOOL'
          && (event.tool === 'quickGeneralization' || event.tool === 'quickGeneralizationTotal'),
        target: '.quickGeneralization', actions: ['setTool', 'resetContext'] },
    ],
    // ESCAPE from any state: drop to select tool, reset transient context,
    // clear the current selection. `setTool` falls through to 'select' for
    // any non-PICK_TOOL event — without it, the toolbar's active-tool
    // highlight stayed on the previous tool after a tool-exiting ESC.
    ESCAPE: { target: '.selecting', actions: ['setTool', 'resetContext', 'clearSelectionAction'] },
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
    CONNECT_CHILD_TO_ISA: {
      target: '.connectToGeneralization.waitingForChild',
      actions: 'beginConnectChildToIsa',
    },
    // Viewport shortcuts (keyboard dispatches these via keybindings).
    FIT: { actions: 'fit' },
    ZOOM_IN: { actions: 'zoomIn' },
    ZOOM_OUT: { actions: 'zoomOut' },
    // Events declared in EditorEvent but whose behaviour lands in later phases.
    // Kept as explicit no-ops so the machine acknowledges the event type and
    // the keybindings registry never silently drops a user shortcut.
    RENAME: { actions: 'beginRenameSelected' }, // Phase 6: inline rename UI
    CYCLE_SELECTION: {},      // Phase 6: Tab / Shift+Tab selection cycle
    INVERT_SELECTION: {},     // Phase 6: Shift+Alt+A
    CONFIRM: {},              // Phase 6: modal-level confirm
    CANCEL: {},               // Phase 6: modal-level cancel
    HANDLE_POINTER_DOWN: {},  // Phase 4: React Flow handles
    // Edge-click selection: fires from any state. Selecting an edge doesn't
    // interfere with placing/drawing flows (placing cares about
    // CANVAS_POINTER_UP, drawing cares about NODE_POINTER_DOWN) — worst
    // case, picking an edge while in Entity mode just selects it and leaves
    // the tool active.
    EDGE_POINTER_DOWN: {
      guard: 'isLeftButton',
      actions: 'selectEdgeFromEvent',
    },
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
          on: {
            NODE_POINTER_DOWN: [
              {
                // Only entity / relationship / attribute can host an attribute child.
                // After placing, stay in `placing.attribute` so the user can
                // place more without re-picking the tool from the toolbar.
                // Press Escape (or pick another tool) to exit.
                guard: 'canHostAttribute',
                actions: 'placeAttributeOnParentAction',
              },
            ],
            CANVAS_POINTER_UP: {
              actions: 'rejectOrphanAttributeToast',
            },
          },
        },
        isa: {
          on: { CANVAS_POINTER_UP: { actions: 'placeNodeAction' } },
        },
      },
    },
    drawing: {
      initial: 'idle',
      // Guide the user out of the tool when they pick a different one or
      // press Escape. Individual idle/fromPicked states show their own toast.
      exit: 'clearFlowToast',
      states: {
        idle: {
          entry: 'toastConnectPickSource',
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
              entry: 'toastConnectPickTarget',
              on: {
                // Clicks on nodes arrive as NODE_POINTER_DOWN (synthesised from
                // React Flow's `onNodeClick` — see useRfEvents.ts).
                // NODE_POINTER_UP is kept for compat with direct drag-style
                // connection flows.
                //
                // Intentionally no CANVAS_POINTER_DOWN cancel handler here.
                // RF v12 does NOT stop propagation on node-wrapper pointer
                // events, so a real pointerdown on the target node bubbles to
                // useMouse and fires CANVAS_POINTER_DOWN *before* onNodeClick
                // synthesises NODE_POINTER_DOWN. Cancelling on pointerdown
                // would reset the connection before the target event arrives
                // and silently break every click-to-connect. Cancellation is
                // handled by ESCAPE / PICK_TOOL / CANCEL instead — matching
                // the quickRelationship and quickGeneralization flows.
                NODE_POINTER_DOWN: {
                  target: '#editor.drawing.idle',
                  actions: ['connectNodesAction', 'resetContext', 'clearFlowToast'],
                },
                NODE_POINTER_UP: {
                  target: '#editor.drawing.idle',
                  actions: ['connectNodesAction', 'resetContext', 'clearFlowToast'],
                },
                // Cancel on blank-pane click (only signal that distinguishes
                // a true pane click from a node click — RF fires onPaneClick
                // exclusively when the click target is the pane).
                PANE_CLICK: {
                  target: '#editor.drawing.idle',
                  actions: 'resetContext',
                },
                // Two-stage ESC: first ESC cancels just the partial connection
                // and returns to drawing.idle (still in connect tool); a
                // second ESC fired from idle falls through to the root
                // ESCAPE handler and drops to the select tool. Overrides the
                // root ESCAPE for this state only.
                ESCAPE: {
                  target: '#editor.drawing.idle',
                  actions: 'resetContext',
                },
              },
            },
          },
        },
      },
    },
    quickRelationship: {
      initial: 'idle',
      exit: 'clearFlowToast',
      states: {
        idle: {
          entry: 'toastQuickRelPickFirst',
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
          entry: 'toastQuickRelPickSecond',
          on: {
            NODE_POINTER_DOWN: {
              guard: ({ context, event }) =>
                event.type === 'NODE_POINTER_DOWN' && event.button === 'left'
                  && context.quickFirstId !== null && event.nodeId !== context.quickFirstId,
              target: '#editor.quickRelationship.idle',
              actions: ['connectNodesAction', 'resetContext', 'clearFlowToast'],
            },
            PANE_CLICK: {
              target: '#editor.quickRelationship.idle',
              actions: 'resetContext',
            },
            // Two-stage ESC — see drawing.connection.fromPicked for rationale.
            ESCAPE: {
              target: '#editor.quickRelationship.idle',
              actions: 'resetContext',
            },
          },
        },
      },
    },
    quickGeneralization: {
      initial: 'idle',
      exit: 'clearFlowToast',
      states: {
        idle: {
          entry: 'toastQuickGenPickParent',
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
          entry: 'toastQuickGenPickChild',
          on: {
            NODE_POINTER_DOWN: {
              guard: ({ context, event }) =>
                event.type === 'NODE_POINTER_DOWN' && event.button === 'left'
                  && context.quickFirstId !== null && event.nodeId !== context.quickFirstId,
              target: '#editor.quickGeneralization.idle',
              actions: ['connectNodesAction', 'resetContext', 'clearFlowToast'],
            },
            PANE_CLICK: {
              target: '#editor.quickGeneralization.idle',
              actions: 'resetContext',
            },
            // Two-stage ESC — see drawing.connection.fromPicked for rationale.
            ESCAPE: {
              target: '#editor.quickGeneralization.idle',
              actions: 'resetContext',
            },
          },
        },
      },
    },
    // Entered via root-level CONNECT_CHILD_TO_ISA (right-click on ISA →
    // "Add child entity"). The ISA's id lives in context.connectionFromId
    // until the user picks a child entity or cancels.
    connectToGeneralization: {
      initial: 'waitingForChild',
      exit: 'clearFlowToast',
      states: {
        waitingForChild: {
          entry: 'toastAddChildToIsa',
          on: {
            NODE_POINTER_DOWN: {
              target: '#editor.selecting.idle',
              actions: ['connectChildToIsaAction', 'resetContext'],
            },
            PANE_CLICK: {
              target: '#editor.selecting.idle',
              actions: 'resetContext',
            },
          },
        },
      },
    },
  },
})
