import type { ReactNode } from 'react';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <h2 className="eyebrow">{children}</h2>;
}

// The one selected mark: bright text with a line under it.
export function Picked({ isOn, children }: { isOn?: boolean; children: ReactNode }) {
  return (
    <span className="picked" data-on={isOn}>
      {children}
    </span>
  );
}

export function ValueText({ children }: { children: ReactNode }) {
  return <span className="value-text">{children}</span>;
}
