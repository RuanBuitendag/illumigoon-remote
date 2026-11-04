import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { createContext, useContext, useState, type ReactNode } from 'react';

type DialogProps = {
  label: string;
  // Room for a table. Without it the dialog is the width of a form.
  isWide?: boolean;
  children: ReactNode;
  onClose: () => void;
};

const CloseDialog = createContext<() => void>(() => undefined);

// Closes the dialog this is inside with its leaving motion, then calls its `onClose`.
export const useCloseDialog = () => useContext(CloseDialog);

// A dialog on a scrim. It takes the focus when it opens, keeps Tab inside it, and gives the focus back
// when it closes. Escape, a press on the scrim and `useCloseDialog` close it with its leaving motion, and
// `onClose` follows when the motion ends. It stays where it is rendered, so it keeps the styles and the
// stacking of the screen that opened it.
export function Dialog({ label, isWide, children, onClose }: DialogProps) {
  const [place, setPlace] = useState<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const close = () => setIsOpen(false);
  return (
    <div className="dialog-place" ref={setPlace}>
      {place && (
        <BaseDialog.Root
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) close();
          }}
          onOpenChangeComplete={(open) => {
            if (!open) onClose();
          }}
        >
          <BaseDialog.Portal container={place} className="dialog-frame">
            <BaseDialog.Backdrop className="dialog-scrim" />
            <BaseDialog.Popup className="dialog" aria-label={label} data-wide={isWide}>
              <CloseDialog.Provider value={close}>{children}</CloseDialog.Provider>
            </BaseDialog.Popup>
          </BaseDialog.Portal>
        </BaseDialog.Root>
      )}
    </div>
  );
}
