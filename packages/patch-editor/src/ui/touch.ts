/**
 * The words a hint uses for a pointer, so a phone is not told to hover (LIFE-1934).
 *
 * Asked each time rather than once, because a laptop with a touch screen can be either.
 */

const canHover = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover)').matches;

/** "hover" with a mouse, "tap" on a phone: a tap on a slot opens it, and it lists what it drives. */
export const pointAt = () => (canHover() ? 'hover' : 'tap');

/** "double-click" with a mouse, "double-tap" on a phone. */
export const doubleClick = () => (canHover() ? 'double-click' : 'double-tap');
