/**
 * The words a hint uses for a pointer, so a phone is not told to hover (LIFE-1934).
 *
 * Asked each time rather than once, because a laptop with a touch screen can be either.
 */

const canHover = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover)').matches;

/** "double-click" with a mouse, "double-tap" on a phone. */
export const doubleClick = () => (canHover() ? 'double-click' : 'double-tap');
