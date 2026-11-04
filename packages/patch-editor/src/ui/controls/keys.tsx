/**
 * Edit's keys. The only place in Edit that writes a `<button>`: everywhere else draws one of these, so
 * a key's look and its hit area are decided once (TL-5). Each takes the props of a button, so a key in
 * a dragged row or under a menu keeps its own handlers.
 *
 * A key with no look of its own is the design system's `Press` in spirit. `Press` takes no `title`,
 * `ref`, data attributes or pointer handlers, which Edit's rows need, so Edit keeps this one until it does.
 */

import type { ComponentProps } from 'react';
import { Picked } from '../../../../../src/design-system';

type ButtonProps = Omit<ComponentProps<'button'>, 'type'>;

const classes = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ') || undefined;

/** A key with no look of its own: the layout comes from `className`. */
export const Key = (props: ButtonProps) => <button type="button" {...props} />;

/** A word key in small capitals. The primary one is in full ink. */
export const Pill = ({ isPrimary, isSmall, className, ...props }: ButtonProps & {
  isPrimary?: boolean;
  isSmall?: boolean;
}) => (
  <Key className={classes('pill', isSmall && 'sm', className)} data-primary={isPrimary || undefined} {...props} />
);

/** A key that is only an icon, so it must say what it does in `label`, which a pointer also shows. */
export const IconKey = ({ label, isSmall, className, ...props }: Omit<ButtonProps, 'title'> & {
  label: string;
  isSmall?: boolean;
}) => <Key className={classes('iconbtn', isSmall && 'sm', className)} aria-label={label} title={label} {...props} />;

/**
 * A key that stays on or off, such as a layer's mute. On wears `Picked`, the one selected mark (D48);
 * off is a step down the ramp. No wash behind it, since a wash is how Edit says a thing is raised.
 */
export const Toggle = ({ isOn, className, children, ...props }: ButtonProps & { isOn: boolean }) => (
  <Key className={classes('tog', className)} aria-pressed={isOn} {...props}>
    <Picked isOn={isOn}>{children}</Picked>
  </Key>
);
