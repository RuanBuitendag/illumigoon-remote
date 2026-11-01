import { useEffect, useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { watchPress, type Pointer } from './hold';

const LIFT_SCALE = 1.02;
const SETTLE_MS = 160;
const SWALLOW_CLICK_MS = 400;
const EDGE_PX = 64;
const EDGE_STEP_PX = 8;
const EDGE_TICK_MS = 16;

type DragItem = { element: HTMLElement; rect: DOMRect };

type Drag = {
  list: HTMLElement;
  items: DragItem[];
  from: number;
  to: number;
  start: Pointer;
  pointer: Pointer;
  scroller: HTMLElement;
  scrollStart: number;
  edgeTimer: number;
};

function scrollerOf(element: HTMLElement) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(node).overflowY)) return node;
  }
  return document.documentElement;
}

const centreOf = ({ left, top, width, height }: DOMRect) => ({ x: left + width / 2, y: top + height / 2 });

function nearestSlot(items: DragItem[], { x, y }: { x: number; y: number }) {
  const distances = items.map(({ rect }) => Math.hypot(centreOf(rect).x - x, centreOf(rect).y - y));
  return distances.indexOf(Math.min(...distances));
}

// Where the item at `index` sits while the dragged one moves from `from` to `to`.
function slotOf(index: number, from: number, to: number) {
  if (from < index && index <= to) return index - 1;
  if (to <= index && index < from) return index + 1;
  return index;
}

// Slots are measured once, so a scroll during the drag only moves the finger through them.
function place(drag: Drag) {
  const { items, from, start, pointer, scroller, scrollStart } = drag;
  const dragged = items[from];
  if (!dragged) return;
  const x = pointer.clientX - start.clientX;
  const y = pointer.clientY - start.clientY + scroller.scrollTop - scrollStart;
  const centre = centreOf(dragged.rect);
  drag.to = nearestSlot(items, { x: centre.x + x, y: centre.y + y });
  items.forEach(({ element, rect }, index) => {
    const slot = items[slotOf(index, from, drag.to)]?.rect ?? rect;
    element.style.transform = `translate(${slot.left - rect.left}px, ${slot.top - rect.top}px)`;
  });
  dragged.element.style.transform = `translate(${x}px, ${y}px) scale(${LIFT_SCALE})`;
}

function edgeStep({ pointer, scroller }: Drag) {
  const { top, bottom } = scroller.getBoundingClientRect();
  if (pointer.clientY < top + EDGE_PX) return -EDGE_STEP_PX;
  return pointer.clientY > bottom - EDGE_PX ? EDGE_STEP_PX : 0;
}

function startDrag(list: HTMLElement, from: number, start: Pointer): Drag {
  const elements = [...list.children] as HTMLElement[];
  const scroller = scrollerOf(list);
  const drag: Drag = {
    list,
    items: elements.map((element) => ({ element, rect: element.getBoundingClientRect() })),
    from,
    to: from,
    start,
    pointer: start,
    scroller,
    scrollStart: scroller.scrollTop,
    edgeTimer: window.setInterval(() => {
      const step = edgeStep(drag);
      if (step === 0) return;
      scroller.scrollTop += step;
      place(drag);
    }, EDGE_TICK_MS),
  };
  list.dataset.sorting = 'true';
  elements[from]?.setAttribute('data-dragging', 'true');
  place(drag);
  return drag;
}

function swallowNextClick() {
  const swallow = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), SWALLOW_CLICK_MS);
}

function clearDrag({ list, items, edgeTimer }: Drag) {
  window.clearInterval(edgeTimer);
  delete list.dataset.sorting;
  for (const { element } of items) {
    element.style.transform = '';
    element.removeAttribute('data-dragging');
  }
}

function movedOrder(ids: string[], from: number, to: number) {
  const next = [...ids];
  const [id] = next.splice(from, 1);
  if (id !== undefined) next.splice(to, 0, id);
  return next;
}

// The list has moved by the time this runs, so the dragged item slides from where the finger left it.
function settle(element: HTMLElement, { left, top }: DOMRect) {
  const landed = element.getBoundingClientRect();
  const transform = `translate(${left - landed.left}px, ${top - landed.top}px)`;
  element.animate([{ transform }, { transform: 'none' }], { duration: SETTLE_MS, easing: 'ease-out' });
}

type DragOrderOptions = {
  ids: string[];
  handle: string;
  needsHold: boolean;
  onOrder: (ids: string[]) => void;
};

// Each child of the list is one id, in order. A press on a `handle` starts a drag: straight away on
// a grip that does nothing else, and after a hold on something that also taps or scrolls.
export function useDragOrder({ ids, handle, needsHold, onOrder }: DragOrderOptions) {
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const endPress = useRef<(() => void) | null>(null);

  // On the list from the start, because iOS ignores a touch listener added after the touch began.
  useEffect(() => {
    const list = listRef.current;
    const stopScroll = (event: TouchEvent) => {
      if (drag.current) event.preventDefault();
    };
    list?.addEventListener('touchmove', stopScroll, { passive: false });
    return () => {
      list?.removeEventListener('touchmove', stopScroll);
      endPress.current?.();
    };
  }, []);

  const finish = (finished: Drag, isLifted: boolean) => {
    const { from, to, items } = finished;
    const element = items[from]?.element;
    const left = element?.getBoundingClientRect();
    clearDrag(finished);
    if (isLifted) swallowNextClick();
    if (isLifted && from !== to) flushSync(() => onOrder(movedOrder(ids, from, to)));
    if (element && left) settle(element, left);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    const pressed = (event.target as Element).closest(handle);
    const from = [...list.children].findIndex((child) => child.contains(pressed));
    if (!pressed || from === -1 || event.button !== 0 || endPress.current) return;
    const start = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY };
    const events = {
      onHold: () => {
        drag.current = startDrag(list, from, start);
      },
      onDrag: (pointer: Pointer) => {
        if (!drag.current) return;
        drag.current.pointer = pointer;
        place(drag.current);
      },
      onEnd: (_wasTap: boolean, wasLifted: boolean) => {
        endPress.current = null;
        if (drag.current) finish(drag.current, wasLifted);
        drag.current = null;
      },
    };
    endPress.current = watchPress(start, events, needsHold ? undefined : 0);
  };

  // A long touch opens the context menu on some browsers.
  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest(handle)) event.preventDefault();
  };

  return { listRef, onPointerDown, onContextMenu };
}
