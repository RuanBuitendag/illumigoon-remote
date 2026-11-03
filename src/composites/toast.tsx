import type { ReactNode } from 'react';

type ToastProps = {
  text: string;
  // The keys on the line, such as UNDO or SAVE. A line with none only tells.
  children?: ReactNode;
  // In Edit the line sits above the dock, so the controls under it stay in reach.
  isOverDock?: boolean;
};

// The one line of feedback along the bottom: ink on paper turned round, one at a time (D20).
export function Toast({ text, children, isOverDock }: ToastProps) {
  return (
    <aside className="toast" data-over-dock={isOverDock}>
      {/* Said aloud when it changes, without moving focus. */}
      <p className="toast-text" role="status" aria-live="polite">
        {text}
      </p>
      {children}
    </aside>
  );
}
