"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_THRESHOLD = 80;

// Shared swipe-down-to-dismiss for bottom sheets - tracks the drag delta
// via pointer events (covers touch and mouse in one listener set, unlike
// separate touchstart/touchmove/touchend handlers) and translates the
// sheet live while dragging. Releasing past DISMISS_THRESHOLD dismisses;
// otherwise it snaps back to translateY(0). Extracted from AuthGateSheet's
// original inline implementation (components/MasonryCards.tsx) so the
// same behavior can be reused by every bottom sheet in the app.
export function useSwipeToDismiss(active: boolean, onDismiss: () => void) {
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (active) setDragY(0);
  }, [active]);

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }
  function endDrag() {
    if (dragY > DISMISS_THRESHOLD) {
      onDismiss();
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  }

  return {
    dragY,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
