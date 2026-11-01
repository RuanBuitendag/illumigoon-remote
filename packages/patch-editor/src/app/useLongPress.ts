/**
 * A finger held still: the touch screen's right-click.
 *
 * Read in the capture phase, because a knob or a fader takes the pointer for its own drag. A finger
 * that moves is dragging or scrolling, so it cancels the press.
 */

import { useRef, type PointerEvent } from 'react';

const HOLD_MS = 500;
const SLOP_PX = 8;

type Press = { x: number; y: number; timer: number };

export function useLongPress(onPress: (target: EventTarget, x: number, y: number) => void) {
  const press = useRef<Press | null>(null);

  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDownCapture = (e: PointerEvent) => {
    cancel();
    if (e.pointerType !== 'touch') return;
    const { target, clientX: x, clientY: y } = e;
    press.current = { x, y, timer: window.setTimeout(() => { press.current = null; onPress(target, x, y); }, HOLD_MS) };
  };

  const onPointerMoveCapture = (e: PointerEvent) => {
    if (!press.current) return;
    if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > SLOP_PX) cancel();
  };

  return { onPointerDownCapture, onPointerMoveCapture, onPointerUpCapture: cancel, onPointerCancelCapture: cancel };
}
