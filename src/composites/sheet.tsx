import type { ReactNode } from 'react';
import { Dialog, Eyebrow, Icon, Press, useCloseDialog } from '../design-system';

// A part of a sheet can take the sheet's own way out, so a key that closes it leaves with the motion.
export type SheetPart = ReactNode | ((close: () => void) => ReactNode);

type SheetProps = {
  // Names the sheet in its head, and to a screen reader.
  label: string;
  icon?: ReactNode;
  // What the head says beside the name: a count, a folder.
  detail?: ReactNode;
  // The sheet's own keys, such as CANCEL and SAVE. A sheet without them closes with a cross.
  actions?: SheetPart;
  // Room for a table. Without it the sheet is the width of a form.
  isWide?: boolean;
  children: SheetPart;
  // What the quiet way out does. Escape and a press outside the sheet do the same.
  onClose: () => void;
};

// The cross leaves with the sheet's motion, and the sheet's `onClose` follows.
function SheetClose() {
  const close = useCloseDialog();
  return (
    <Press className="sheet-close" label="Close" onClick={close}>
      <Icon.X c="currentColor" />
    </Press>
  );
}

// Draws a part, handing it the close that leaves with the sheet's motion.
function WithClose({ part }: { part: SheetPart }) {
  const close = useCloseDialog();
  return typeof part === 'function' ? part(close) : part;
}

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
          {actions ? <WithClose part={actions} /> : <SheetClose />}
        </div>
      </div>
      <WithClose part={children} />
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
