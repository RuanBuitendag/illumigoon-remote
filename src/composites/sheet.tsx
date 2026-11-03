import { type ReactNode, useEffect } from 'react';
import { Eyebrow } from '../design-system';

type SheetProps = {
  label: string;
  title: ReactNode;
  actions: ReactNode;
  // Stays in view while the rest of the sheet scrolls.
  pinned?: ReactNode;
  children: ReactNode;
  // What the quiet way out does: CANCEL or CLOSE. Escape does the same.
  onClose: () => void;
};

// Escape is the change of mind on a keyboard, the same as the sheet's own way out.
function useEscape(onClose: () => void) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
}

export function Sheet({ label, title, actions, pinned, children, onClose }: SheetProps) {
  useEscape(onClose);
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
