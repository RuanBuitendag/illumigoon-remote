import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { useState, type ReactNode } from 'react';

type DialogProps = {
  label: string;
  // Room for a table. Without it the dialog is the width of a form.
  isWide?: boolean;
  children: ReactNode;
  onClose: () => void;
};

// A dialog on a scrim. It takes the focus when it opens, keeps Tab inside it, and gives the focus back
// when it closes. Escape and a press on the scrim close it. It stays where it is rendered, so it keeps
// the styles and the stacking of the screen that opened it.
export function Dialog({ label, isWide, children, onClose }: DialogProps) {
  const [place, setPlace] = useState<HTMLDivElement | null>(null);
  return (
    <div className="dialog-place" ref={setPlace}>
      {place && (
        <BaseDialog.Root
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) onClose();
          }}
        >
          <BaseDialog.Portal container={place} className="dialog-frame">
            <BaseDialog.Backdrop className="dialog-scrim" />
            <BaseDialog.Popup className="dialog" aria-label={label} data-wide={isWide}>
              {children}
            </BaseDialog.Popup>
          </BaseDialog.Portal>
        </BaseDialog.Root>
      )}
    </div>
  );
}
