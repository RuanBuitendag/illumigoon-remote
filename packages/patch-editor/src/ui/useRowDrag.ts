/**
 * Dragging a row by touch.
 *
 * HTML drag and drop never starts from a finger. So a finger on a row's grip plays the same events
 * over the rows under it, and each list keeps its one set of drag handlers. A mouse drags the row
 * itself, as it always has. A row or a space that takes a drop says so with `data-row-drop`.
 */

import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

const EDGE_PX = 64;
const EDGE_STEP_PX = 8;
const EDGE_TICK_MS = 16;

type Held = { row: Element; over: Element | null; y: number; scroller: Element | null; timer: number };

const play = (type: string, element: Element | null) =>
  element?.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));

const dropAt = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest('[data-row-drop]') ?? null;

/** A list longer than the screen moves under a finger held at its edge. */
function scrollAtEdge({ scroller, y }: Held) {
  if (!scroller) return;
  const { top, bottom } = scroller.getBoundingClientRect();
  if (y < top + EDGE_PX) scroller.scrollBy(0, -EDGE_STEP_PX);
  else if (y > bottom - EDGE_PX) scroller.scrollBy(0, EDGE_STEP_PX);
}

function letGo(held: Held) {
  window.clearInterval(held.timer);
  held.row.removeAttribute('data-lifted');
}

export function useRowDrag() {
  const held = useRef<Held | null>(null);
  const hasDragged = useRef(false);

  useEffect(() => () => {
    if (held.current) letGo(held.current);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const row = e.currentTarget.closest('[draggable="true"]');
    if (e.pointerType === 'mouse' || !row) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    row.setAttribute('data-lifted', 'true');
    play('dragstart', row);
    hasDragged.current = false;
    const press: Held = {
      row,
      over: null,
      y: e.clientY,
      scroller: e.currentTarget.closest('.editscroll'),
      timer: window.setInterval(() => scrollAtEdge(press), EDGE_TICK_MS),
    };
    held.current = press;
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const press = held.current;
    if (!press) return;
    hasDragged.current = true;
    press.y = e.clientY;
    press.over = dropAt(e.clientX, e.clientY);
    play('dragover', press.over);
  };

  const finish = (isDropped: boolean) => {
    const press = held.current;
    if (!press) return;
    held.current = null;
    letGo(press);
    if (isDropped) play('drop', press.over);
    play('dragend', press.row);
  };

  // The row's own tap must not fire when the finger has just put it down.
  const onClick = (e: MouseEvent<HTMLElement>) => {
    if (hasDragged.current) e.stopPropagation();
    hasDragged.current = false;
  };

  return {
    className: 'rowgrip',
    onPointerDown,
    onPointerMove,
    onPointerUp: () => finish(true),
    onPointerCancel: () => finish(false),
    onClick,
  };
}
