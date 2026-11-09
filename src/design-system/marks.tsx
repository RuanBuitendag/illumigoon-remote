// A musical note: the look moves to music.
export function SoundMark() {
  return (
    <svg className="sound-mark" role="img" aria-label="Moves to music" viewBox="0 0 12 14">
      <path d="M5 1.5 L11 0 V9.5 A2 2 0 1 1 9.5 7.6 V2.4 L6.5 3.15 V11.5 A2 2 0 1 1 5 9.6 Z" fill="currentColor" />
    </svg>
  );
}


// Work under way with no known end: a hairline with a piece of light that runs along it (D105). A screen reader
// hears a progress bar with no value, named by `label`.
export function Activity({ label }: { label: string }) {
  return (
    <span className="activity" role="progressbar" aria-label={label}>
      <span className="activity-light" />
    </span>
  );
}
