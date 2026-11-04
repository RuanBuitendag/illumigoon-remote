import type { ReactNode } from 'react';

// Every icon is drawn on one square canvas with one line (BR-8): a glyph smaller than the canvas sits at its
// middle, so every icon takes the same box and the same weight beside a word. `icons.test.ts` holds the set to it.
export const ICON_CANVAS = 14;
export const ICON_STROKE = 1.2;

type IconFrameProps = {
  children: ReactNode;
  // Where a glyph drawn smaller than the canvas starts, so that it sits at the middle.
  at?: [number, number];
  // How large the icon is drawn on the page, when not one canvas unit to a pixel.
  size?: number;
  colour?: string;
  // Edit's own line drawings, such as its wave shapes, take their own canvas and line. Icons never do.
  viewBox?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
};

// The frame every icon is drawn in: a fine round-capped line in one colour (D2).
export function IconFrame({ children, at, size = ICON_CANVAS, colour, ...drawing }: IconFrameProps) {
  const { viewBox = `0 0 ${ICON_CANVAS} ${ICON_CANVAS}`, width = size, height = size, strokeWidth = ICON_STROKE } = drawing;
  return (
    <svg
      className="icon"
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      stroke={colour ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {at ? <g transform={`translate(${at[0]} ${at[1]})`}>{children}</g> : children}
    </svg>
  );
}

// The one icon set, in the app and in Edit. `c` is the colour; each icon has the quiet one it
// takes where it says nothing loud.
export const Icon = {
  Grip: () => (
    <IconFrame at={[2, 0]} colour="none">
      {[3, 7, 11].flatMap(y =>
        [2, 8].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="var(--text-5)" />),
      )}
    </IconFrame>
  ),
  Power: ({ c }: { c?: string } = {}) => (
    <IconFrame colour={c ?? 'var(--text-1)'}>
      <path d="M7 2.2v5" />
      <path d="M10.4 3.7a4.6 4.6 0 1 1-6.8 0" />
    </IconFrame>
  ),
  /** A die: the Randomise tab's roll. Pips are filled rather than stroked so they read at 12px. */
  Dice: ({ c, s }: { c?: string; s?: number } = {}) => (
    <IconFrame size={s ?? ICON_CANVAS} colour={c ?? 'var(--text-3)'}>
      <rect x="1.6" y="1.6" width="10.8" height="10.8" rx="2.2" />
      {[
        [4.6, 4.6],
        [9.4, 4.6],
        [7, 7],
        [4.6, 9.4],
        [9.4, 9.4],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.95" fill={c ?? 'var(--text-3)'} stroke="none" />
      ))}
    </IconFrame>
  ),
  Back: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[3.5, 2]} colour={c ?? 'var(--text-3)'}>
      <path d="M5.5 1L1.5 5l4 4" />
    </IconFrame>
  ),
  Fwd: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[3.5, 2]} colour={c ?? 'var(--text-3)'}>
      <path d="M1.5 1l4 4-4 4" />
    </IconFrame>
  ),
  /** `Lock` with its shackle lifted: a part the next roll is free to change. */
  Unlock: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[2, 1]} colour={c ?? 'var(--text-5)'}>
      <rect x="1" y="5" width="8" height="6" rx="1" />
      <path d="M3 5V3.2a2 2 0 0 1 3.9-.7" />
    </IconFrame>
  ),
  Plus: ({ c, s }: { c?: string; s?: number } = {}) => (
    <IconFrame at={[1.5, 1.5]} size={s ?? ICON_CANVAS} colour={c ?? 'var(--text-4)'}>
      <path d="M5.5 1.5v8M1.5 5.5h8" />
    </IconFrame>
  ),
  X: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[2.5, 2.5]} colour={c ?? 'var(--text-5)'}>
      <path d="M1 1l7 7M8 1l-7 7" />
    </IconFrame>
  ),
  /** Down, or up when what it opens is open. */
  Chev: ({ c, isUp }: { c?: string; isUp?: boolean } = {}) => (
    <IconFrame at={[2.5, 4]} colour={c ?? 'var(--text-4)'}>
      <path d={isUp ? 'M1 4.5L4.5 1.5 8 4.5' : 'M1 1.5l3.5 3L8 1.5'} />
    </IconFrame>
  ),
  Arrow: ({ c, w }: { c?: string; w?: number } = {}) => (
    <IconFrame at={[0, 3]} size={w ?? ICON_CANVAS} colour={c ?? 'var(--text-5)'}>
      <path d="M0 4h12M9 1l3 3-3 3" />
    </IconFrame>
  ),
  Lock: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[2, 1]} colour={c ?? 'var(--text-5)'}>
      <rect x="1" y="5" width="8" height="6" rx="1" />
      <path d="M3 5V3.2a2 2 0 0 1 4 0V5" />
    </IconFrame>
  ),
  Link: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[0.5, 0.5]} colour={c ?? 'var(--text-3)'}>
      <path d="M5.2 7.8a2.5 2.5 0 0 0 3.6 0l1.7-1.7a2.5 2.5 0 1 0-3.6-3.6l-1 1" />
      <path d="M7.8 5.2a2.5 2.5 0 0 0-3.6 0L2.5 6.9a2.5 2.5 0 1 0 3.6 3.6l1-1" />
    </IconFrame>
  ),
  Radio: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[0.5, 0.5]} colour={c ?? 'var(--text-3)'}>
      <path d="M2.2 8.7a5.3 5.3 0 0 1 0-4.4M10.8 4.3a5.3 5.3 0 0 1 0 4.4" />
      <circle cx="6.5" cy="6.5" r="1.4" fill={c ?? 'var(--text-3)'} stroke="none" />
    </IconFrame>
  ),
  Folder: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[0, 1]} colour={c ?? 'var(--text-3)'}>
      <path
        d={
          'M1 3.2a1 1 0 0 1 1-1h3l1.2 1.5H12a1 1 0 0 1 1 1v5.1a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z'
        }
      />
    </IconFrame>
  ),
  /** Out of the app and onto the disk. */
  Down: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[1, 1]} colour={c ?? 'var(--text-5)'}>
      <path d="M6 1.4v6.4M3.6 5.6L6 8l2.4-2.4M1.6 10.4h8.8" />
    </IconFrame>
  ),
  /** Off the disk and into the app. */
  Up: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[1, 1]} colour={c ?? 'var(--text-5)'}>
      <path d="M6 8.6V2.2M3.6 4.6L6 2.2l2.4 2.4M1.6 10.4h8.8" />
    </IconFrame>
  ),
  Copy: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[1, 1]} colour={c ?? 'var(--text-5)'}>
      <rect x="4.2" y="1.4" width="6.4" height="6.4" rx="1" />
      <path d="M7.8 10.6H2.4a1 1 0 0 1-1-1V4.2" />
    </IconFrame>
  ),
  /** Several lines becoming one — the mix, on MASTER's row. */
  Mix: ({ c }: { c?: string } = {}) => (
    <IconFrame colour={c ?? 'var(--text-4)'}>
      <path d="M2 3h3.5L9 7M2 7h7M2 11h3.5L9 7M9 7h3" />
    </IconFrame>
  ),
  /** Two of the same thing, side by side — duplicate, as against Copy's clipboard. */
  Dup: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[1, 1]} colour={c ?? 'var(--text-5)'}>
      <rect x="1.3" y="1.3" width="6" height="6" rx="1" />
      <rect x="4.7" y="4.7" width="6" height="6" rx="1" />
    </IconFrame>
  ),
  /** A light showing itself: flash a strip so the one on the wall answers for its name. */
  Flash: ({ c }: { c?: string } = {}) => (
    <IconFrame colour={c ?? 'var(--text-4)'}>
      <circle cx="7" cy="7" r="2" />
      <path
        d={
          'M7 1.5v1.6M7 10.9v1.6M1.5 7h1.6M10.9 7h1.6M3.1 3.1l1.1 1.1M9.8 9.8l1.1 1.1M3.1 ' +
          '10.9l1.1-1.1M9.8 4.2l1.1-1.1'
        }
      />
    </IconFrame>
  ),
  /** Into something: open a light in the editor. */
  Open: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[1, 1]} colour={c ?? 'var(--text-4)'}>
      <path d="M4 2.5h5.5V8" />
      <path d="M9.5 2.5L3 9" />
    </IconFrame>
  ),
  /** A window with its left column marked: show or hide the patch rail. */
  Rail: ({ c }: { c?: string } = {}) => (
    <IconFrame at={[0, 1]} colour={c ?? 'var(--text-3)'}>
      <rect x="1" y="1" width="12" height="10" rx="1.5" />
      <path d="M5 1v10" />
    </IconFrame>
  ),
}
