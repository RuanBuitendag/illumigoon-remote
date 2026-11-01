/**
 * Whether a rack is shut, remembered between sessions.
 *
 * The two racks sit at the bottom of the window and cost about 150px each, taken off the
 * canvas — which is the surface you are watching while you turn a knob. A patch with no
 * modulators still pays for the modulator rack, and somebody tuning a colour ramp is not
 * using either. Shutting one should give the height back.
 *
 * COLLAPSES TO ITS HEADER, not to nothing. A rack that vanished entirely would take its own
 * way back with it, and a count of what is in there — `4 / 16` — is worth a strip of window
 * even when the tiles are not.
 *
 * Per viewer and per browser, which is what `localStorage` is for. It is not part of the
 * patch: two people editing the same patch on two laptops have no business agreeing about
 * which racks are open, and a preference that rode in the document would be a diff every
 * time somebody folded something away.
 *
 * Every access is guarded. `localStorage` throws outright in a private window or with site
 * data blocked, and a rack that would not draw because a preference could not be read would
 * be a far worse bug than a rack that forgets.
 */

import { useCallback, useState } from 'react';

/**
 * A view choice from a fixed set, remembered the same way a rack is: per viewer, guarded, and
 * falling back to the default on anything it does not recognise.
 *
 * Which tab the right-hand column shows is this. It outgrew a boolean the moment the column had
 * three tabs, and a second store beside this one would be two places for "remember this view"
 * to mean slightly different things (LIFE-850).
 *
 * THE VALUE IS CHECKED AGAINST `items` ON READ. A stored tab this build no longer has -- a
 * rename, a tab removed -- is the default rather than a column showing nothing.
 */
export function useRemembered<T extends string>(
  key: string, items: readonly T[], def: T,
): [T, (next: T | ((was: T) => T)) => void] {
  // A function, so the read happens once on mount rather than on every render.
  const [value, setValue] = useState<T>(() => {
    try {
      const v = localStorage.getItem(key);
      return v !== null && (items as readonly string[]).includes(v) ? (v as T) : def;
    } catch { return def; }
  });

  // Takes an updater as well as a value: two toggles landing in one frame must both count, which
  // a toggle that read the value from its own render would not.
  const set = useCallback((next: T | ((was: T) => T)) => {
    setValue(was => {
      const now = typeof next === 'function' ? next(was) : next;
      try { localStorage.setItem(key, now); } catch { /* blocked or full */ }
      return now;
    });
  }, [key]);

  return [value, set];
}

/**
 * @returns whether the rack is shut, and a toggle.
 *
 * @param shutByDefault for something a person opts INTO rather than out of -- the preview
 *   strip, which loads an engine and repaints every frame, starts shut. The racks start open.
 *
 * `'1'` / `'0'` under `modulight.rack.<rack>.shut`, as it always was, so a rack folded away
 * before this was built on `useRemembered` is still folded away.
 */
export function useCollapsed(rack: string, shutByDefault = false): [boolean, () => void] {
  const [v, set] = useRemembered(
    `modulight.rack.${rack}.shut`,
    ['1', '0'] as const,
    shutByDefault ? '1' : '0',
  )
  const toggle = useCallback(() => set(was => (was === '1' ? '0' : '1')), [set]);
  return [v === '1', toggle];
}
