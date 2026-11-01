import { useLayoutEffect, useRef } from 'react';

/**
 * A ref that always holds the newest `value`, for a loop or a teardown that must not resubscribe
 * when the value changes. Written after the render and before the paint: a ref written during a
 * render can hold a value from a render React then threw away.
 */
export function useLatest<T>(value: T) {
  const latest = useRef(value);
  useLayoutEffect(() => { latest.current = value; });
  return latest;
}
