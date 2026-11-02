import type { ReactNode } from 'react';
import { Eyebrow } from '../design-system';

type SheetProps = {
  label: string;
  title: ReactNode;
  actions: ReactNode;
  // Stays in view while the rest of the sheet scrolls.
  pinned: ReactNode;
  children: ReactNode;
};

export function Sheet({ label, title, actions, pinned, children }: SheetProps) {
  return (
    <section className="sheet" role="dialog" aria-label={label}>
      <div className="sheet-pinned">
        <div className="sheet-heading">
          <h2 className="sheet-title">{title}</h2>
          {actions}
        </div>
        {pinned}
      </div>
      {children}
    </section>
  );
}

export function SheetFooter({ children }: { children: ReactNode }) {
  return <div className="sheet-footer">{children}</div>;
}

export function ControlList({ children }: { children: ReactNode }) {
  return <div className="control-list">{children}</div>;
}

export function ControlGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="control-group">
      {title && <Eyebrow>{title.toUpperCase()}</Eyebrow>}
      {children}
    </div>
  );
}
