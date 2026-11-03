import type { ReactNode } from 'react';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <h2 className="eyebrow">{children}</h2>;
}

type PickedProps = {
  isOn?: boolean;
  // Under: bright text with a line under it, for a choice in a row of choices. Side: a rule down the
  // left of a selected row, drawn inside the row, which then holds no text of its own.
  edge?: 'under' | 'side';
  children?: ReactNode;
};

// The one selected mark, in the app and in Edit.
export function Picked({ isOn, edge = 'under', children }: PickedProps) {
  return (
    <span className="picked" data-on={isOn} data-edge={edge} aria-hidden={edge === 'side' || undefined}>
      {children}
    </span>
  );
}

export function ValueText({ children }: { children: ReactNode }) {
  return <span className="value-text">{children}</span>;
}
