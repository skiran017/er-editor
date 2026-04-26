import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useInteractionStore } from "@/interaction/interactionStore";
import { useViewportStore } from "@/state/viewportStore";
import { NO_MODIFIERS } from "@/interaction/events";

export interface TouchHandlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
}

// Points reported to the FSM are in WORLD / flow coordinates — see useMouse
// for the rationale. screenToFlowPosition is an identity when no <ReactFlow>
// is mounted, so unit tests keep working unchanged.
//
// Single-finger gesture state machine (mirrors the legacy app):
//  - QUICK TAP (down + up under LONG_PRESS_MS, no movement above PAN_THRESHOLD_PX):
//    no FSM event from useTouch. RF synthesises onNodeClick / onPaneClick from
//    the underlying click event so taps still select / clear via useRfEvents.
//  - DRAG (down + move > PAN_THRESHOLD_PX before LONG_PRESS_MS): viewport pan.
//    Updates `viewportStore.pan` directly per move — no FSM event. Cancels
//    the long-press timer.
//  - LONG-PRESS THEN DRAG (down + 500ms idle, then drag): rubberband select.
//    On long-press fire we dispatch CANVAS_POINTER_DOWN at the original start
//    so `selecting.rubberBand` opens at the touch origin, then every move
//    fires CANVAS_POINTER_MOVE, and pointer-up fires CANVAS_POINTER_UP.
//    Haptic via `navigator.vibrate(50)` if available.
//
// Two-finger gesture contract (unchanged):
//  - While both fingers are down, each pointermove decides between zoom and pan:
//      zoom: |distChange| > midShift  → dispatch WHEEL_ZOOM (pinch)
//      pan:  midShift >= |distChange| → update viewportStore.pan directly
//  - CANVAS_POINTER_MOVE is suppressed while secondPointerId is non-null.
//  - Lifting the second finger restores single-finger behaviour silently.
//
// Pen events update only `penActiveRef` (palm rejection) and never dispatch
// from useTouch — pen flows through useMouse instead.
const PINCH_ZOOM_FACTOR = 0.005;
const LONG_PRESS_MS = 500;
const PAN_THRESHOLD_PX = 8;

// React Flow v12 doesn't stop propagation on node/edge pointer events, so a
// touch on a node bubbles up to the wrapper-level useTouch handler too. Without
// this filter, tapping a node fires both CANVAS_POINTER_DOWN (entering
// selecting.rubberBand) AND React Flow's native node-click handling, producing
// a phantom rubberband under the user's finger. Mirrors the same filter in
// useMouse.
const isNodeOrEdgeTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return target.closest(".react-flow__node, .react-flow__edge") !== null;
};

type GestureMode = "idle" | "pending" | "panning" | "rubberband";

export const useTouch = (): TouchHandlers => {
  const activePointerId = useRef<number | null>(null);
  const secondPointerId = useRef<number | null>(null);
  const lastDist = useRef<number>(0);
  const lastMidClient = useRef<{ x: number; y: number } | null>(null);
  // Per-pointer last client-space position, keyed by pointerId.
  const pointerById = useRef<Map<number, { x: number; y: number }>>(new Map());
  const penActiveRef = useRef<boolean>(false);

  // Single-finger gesture state.
  // - 'idle': no finger down (or only the second finger, which is gesture-only)
  // - 'pending': finger down on empty canvas, waiting to see if it's a
  //     long-press, drag (pan), or quick tap.
  // - 'panning': finger crossed PAN_THRESHOLD_PX before the long-press timer
  //     fired — every subsequent move pans the viewport.
  // - 'rubberband': long-press timer fired before the user moved — every
  //     subsequent move grows the rubberband selection in the FSM.
  const gestureMode = useRef<GestureMode>("idle");
  const startClient = useRef<{ x: number; y: number } | null>(null);
  const lastPanClient = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { screenToFlowPosition } = useReactFlow();
  const toFlow = (e: { clientX: number; clientY: number }) =>
    screenToFlowPosition({ x: e.clientX, y: e.clientY });

  const clearLongPress = (): void => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const resetSingleFingerState = (): void => {
    clearLongPress();
    gestureMode.current = "idle";
    startClient.current = null;
    lastPanClient.current = null;
  };

  return {
    onPointerDown: (e) => {
      if (e.pointerType === "pen") {
        penActiveRef.current = true;
        return;
      }
      if (e.pointerType !== "touch") return;
      if (penActiveRef.current) return; // palm rejection — pen is active, drop touch
      if (isNodeOrEdgeTarget(e.target)) return;

      pointerById.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointerId.current === null) {
        // First finger down on empty canvas. Enter 'pending' — long-press
        // timer or movement threshold will decide whether this becomes a
        // rubberband, a viewport pan, or a quick tap.
        activePointerId.current = e.pointerId;
        gestureMode.current = "pending";
        startClient.current = { x: e.clientX, y: e.clientY };
        lastPanClient.current = { x: e.clientX, y: e.clientY };
        // Capture the start position by value — `e` is reused by React's
        // synthetic event pool so the closure must not reference it directly.
        const startX = e.clientX;
        const startY = e.clientY;
        const startPoint = toFlow({ clientX: startX, clientY: startY });
        longPressTimer.current = setTimeout(() => {
          // Long-press fired: enter rubberband mode and seed the FSM with a
          // CANVAS_POINTER_DOWN at the original touch position.
          if (gestureMode.current !== "pending") return;
          gestureMode.current = "rubberband";
          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            navigator.vibrate(50);
          }
          useInteractionStore.getState().send({
            type: "CANVAS_POINTER_DOWN",
            point: startPoint,
            modifiers: NO_MODIFIERS,
            button: "left",
          });
        }, LONG_PRESS_MS);
      } else if (
        secondPointerId.current === null &&
        e.pointerId !== activePointerId.current
      ) {
        // Second finger landed — abandon any single-finger gesture in flight,
        // switch to two-finger mode.
        clearLongPress();
        if (gestureMode.current === "rubberband") {
          // Cancel the in-progress rubberband by sending a pointer-up at the
          // current position so the FSM exits selecting.rubberBand cleanly.
          useInteractionStore.getState().send({
            type: "CANVAS_POINTER_UP",
            point: toFlow(e),
          });
        }
        gestureMode.current = "idle";
        secondPointerId.current = e.pointerId;
        const p1 = pointerById.current.get(activePointerId.current)!;
        const p2 = pointerById.current.get(e.pointerId)!;
        lastDist.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        lastMidClient.current = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
    },
    onPointerMove: (e) => {
      if (e.pointerType !== "touch") return;
      if (!pointerById.current.has(e.pointerId)) return;
      pointerById.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Two-finger path takes priority.
      if (secondPointerId.current !== null) {
        const p1 = pointerById.current.get(activePointerId.current!)!;
        const p2 = pointerById.current.get(secondPointerId.current)!;
        const newDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midClient = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const lastMid = lastMidClient.current ?? midClient;
        const distChange = newDist - lastDist.current;
        const midShiftX = midClient.x - lastMid.x;
        const midShiftY = midClient.y - lastMid.y;
        const midShift = Math.hypot(midShiftX, midShiftY);

        if (Math.abs(distChange) > midShift) {
          const delta = distChange * PINCH_ZOOM_FACTOR;
          const anchor = screenToFlowPosition(midClient);
          useInteractionStore
            .getState()
            .send({ type: "WHEEL_ZOOM", anchor, delta });
        } else {
          const { zoom, pan } = useViewportStore.getState();
          useViewportStore.getState().setViewport({
            zoom,
            pan: { x: pan.x + midShiftX, y: pan.y + midShiftY },
          });
        }

        lastDist.current = newDist;
        lastMidClient.current = midClient;
        return;
      }

      if (e.pointerId !== activePointerId.current) return;

      // Single-finger path branches on gesture mode.
      if (gestureMode.current === "pending") {
        // Still waiting on the long-press timer — has the user moved enough
        // to commit to a pan?
        const start = startClient.current;
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) >= PAN_THRESHOLD_PX) {
          clearLongPress();
          gestureMode.current = "panning";
          lastPanClient.current = { x: e.clientX, y: e.clientY };
          // Don't dispatch — pan is direct viewport store updates. Wait for
          // the NEXT move event to start applying deltas (we just consumed
          // the threshold-crossing move to detect the pan intent).
        }
        return;
      }

      if (gestureMode.current === "panning") {
        const last = lastPanClient.current;
        if (!last) return;
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        const { zoom, pan } = useViewportStore.getState();
        useViewportStore.getState().setViewport({
          zoom,
          pan: { x: pan.x + dx, y: pan.y + dy },
        });
        lastPanClient.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (gestureMode.current === "rubberband") {
        useInteractionStore.getState().send({
          type: "CANVAS_POINTER_MOVE",
          point: toFlow(e),
        });
      }
    },
    onPointerUp: (e) => {
      if (e.pointerType === "pen") {
        penActiveRef.current = false;
        return;
      }
      if (e.pointerType !== "touch") return;
      pointerById.current.delete(e.pointerId);

      if (e.pointerId === secondPointerId.current) {
        secondPointerId.current = null;
        lastDist.current = 0;
        lastMidClient.current = null;
        return;
      }

      if (e.pointerId !== activePointerId.current) return;

      // The active finger lifted. Close out whatever single-finger gesture
      // was in progress.
      const wasRubberband = gestureMode.current === "rubberband";
      activePointerId.current = null;
      secondPointerId.current = null;
      lastDist.current = 0;
      lastMidClient.current = null;
      resetSingleFingerState();

      if (wasRubberband) {
        // Commit the marquee selection.
        useInteractionStore.getState().send({
          type: "CANVAS_POINTER_UP",
          point: toFlow(e),
        });
        return;
      }
      // 'pending' (quick tap) and 'panning' both end silently from the
      // FSM's point of view. Quick taps on empty pane are handled by RF's
      // onPaneClick → useRfEvents PANE_CLICK; pans are direct viewport updates.
    },
    onPointerCancel: (e) => {
      if (e.pointerType === "pen") {
        penActiveRef.current = false;
        return;
      }
      if (e.pointerType !== "touch") return;
      pointerById.current.delete(e.pointerId);

      if (e.pointerId === secondPointerId.current) {
        secondPointerId.current = null;
        lastDist.current = 0;
        lastMidClient.current = null;
        return;
      }

      if (e.pointerId !== activePointerId.current) return;

      const wasRubberband = gestureMode.current === "rubberband";
      activePointerId.current = null;
      secondPointerId.current = null;
      lastDist.current = 0;
      lastMidClient.current = null;
      resetSingleFingerState();

      if (wasRubberband) {
        // Tell the FSM the rubberband sequence ended so it doesn't stay
        // parked in selecting.rubberBand.
        useInteractionStore.getState().send({
          type: "CANVAS_POINTER_UP",
          point: toFlow(e),
        });
      }
    },
  };
};
