import type { ReactNode } from 'react';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <h2 className="eyebrow">{children}</h2>;
}

export function ValueText({ children }: { children: ReactNode }) {
  return <span className="value-text">{children}</span>;
}
