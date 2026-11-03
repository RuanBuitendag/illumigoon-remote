import type { ReactNode } from 'react';
import { CrossMark, Dialog, Eyebrow, Press } from '../design-system';

type SheetProps = {
  // Names the sheet in its head, and to a screen reader.
  label: string;
  icon?: ReactNode;
  // What the head says beside the name: a count, a folder.
  detail?: ReactNode;
  // The sheet's own keys, such as CANCEL and SAVE. A sheet without them closes with a cross.
  actions?: ReactNode;
  // Room for a table. Without it the sheet is the width of a form.
  isWide?: boolean;
  children: ReactNode;
  // What the quiet way out does. Escape and a press outside the sheet do the same.
  onClose: () => void;
};

// The one sheet, in the app and in Edit: a head with the name and the way out, over what the sheet holds.
export function Sheet({ label, icon, detail, actions, isWide, children, onClose }: SheetProps) {
  return (
    <Dialog label={label} isWide={isWide} onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-name">
          {icon}
          <h2 className="sheet-title">{label}</h2>
        </div>
        <div className="sheet-keys">
          {detail}
          {actions ?? (
            <Press className="sheet-close" label="Close" onClick={onClose}>
              <CrossMark />
            </Press>
          )}
        </div>
      </div>
      {children}
    </Dialog>
  );
}

// The part of a sheet that scrolls, with the sheet's margins: a form, a question, a list of choices.
export function SheetBody({ children }: { children: ReactNode }) {
  return <div className="sheet-body">{children}</div>;
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
