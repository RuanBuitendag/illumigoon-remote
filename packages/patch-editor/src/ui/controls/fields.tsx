/**
 * Edit's fields and menus. The only place in Edit that writes an `<input>` or a `<select>` (TL-5).
 * Each one needs a `label`, so a field is never left without a name for a screen reader (CM-9).
 */

import type { ComponentProps } from 'react';

/** A text or number field. Its look comes from `className`. */
export const Field = ({ label, ...props }: Omit<ComponentProps<'input'>, 'aria-label'> & { label: string }) => (
  <input aria-label={label} {...props} />
);

/** A native menu, so the list that opens is the platform's own (FO-17). */
export const Choice = ({ label, ...props }: Omit<ComponentProps<'select'>, 'aria-label'> & { label: string }) => (
  <select aria-label={label} {...props} />
);
