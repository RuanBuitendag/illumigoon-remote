import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

// Tap acts and hold shows. A finger that stays still for this long is a hold.
const HOLD_MS = 400;
// A finger that moves further than this is scrolling, so lists still scroll from a row.
const MOVE_LIMIT_PX = 10;

export type Pointer = Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>;

type PressEvents = {
  onHold: () => void;
  onDrag?: (pointer: Pointer) => void;
  onEnd: (wasTap: boolean, wasLifted: boolean) => void;
};

// Follows one pointer to its end. The listeners sit on the window, because a finger can leave the
// row it started on. A press that drags keeps going after the hold, however far the finger moves.
// The returned function ends the press early.
export function watchPress(start: Pointer, { onHold, onDrag, onEnd }: PressEvents, holdMs = HOLD_MS) {
  let isHeld = false;
  const hold = () => {
    isHeld = true;
    onHold();
  };
  // With no hold to wait for, the press holds at once, so a fast drag is not taken for a scroll.
  const timer = holdMs > 0 ? window.setTimeout(hold, holdMs) : 0;

  const stop = (wasTap: boolean, wasLifted = false) => {
    window.clearTimeout(timer);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onLift);
    window.removeEventListener('pointercancel', onCancel);
    onEnd(wasTap, wasLifted);
  };
  const isThisPointer = ({ pointerId }: Pointer) => pointerId === start.pointerId;
  const onMove = (event: PointerEvent) => {
    if (!isThisPointer(event)) return;
    const distance = Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY);
    if (isHeld && onDrag) onDrag(event);
    else if (distance > MOVE_LIMIT_PX) stop(false);
  };
  const onLift = (event: PointerEvent) => {
    if (isThisPointer(event)) stop(!isHeld, true);
  };
  const onCancel = (event: PointerEvent) => {
    if (isThisPointer(event)) stop(false);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onLift);
  window.addEventListener('pointercancel', onCancel);
  if (holdMs === 0) hold();
  return () => stop(false);
}

// A press under `HOLD_MS` stays a tap, and the click that follows a hold or a scroll is swallowed.
export function useHold(onHold?: () => void, onHoldEnd?: () => void) {
  const [isHeld, setHeld] = useState(false);
  const isTap = useRef(true);
  const endPress = useRef<(() => void) | null>(null);

  useEffect(() => () => endPress.current?.(), []);

  const onPointerDown = (event: ReactPointerEvent) => {
    isTap.current = true;
    if (!onHold || event.button !== 0 || endPress.current) return;
    let didHold = false;
    endPress.current = watchPress(event, {
      onHold: () => {
        didHold = true;
        setHeld(true);
        onHold();
      },
      onEnd: (wasTap) => {
        endPress.current = null;
        isTap.current = wasTap;
        setHeld(false);
        if (didHold) onHoldEnd?.();
      },
    });
  };

  // A long touch opens the context menu on some browsers.
  const onContextMenu = (event: MouseEvent) => {
    if (onHold) event.preventDefault();
  };

  return { isHeld, isTap, onPointerDown, onContextMenu };
}
