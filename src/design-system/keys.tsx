import { Switch } from '@base-ui/react/switch';
import { useRef, type ReactNode } from 'react';
import { useHold } from './hold';
import { Icon } from './icons';
import { Picked } from './text';

type PressProps = {
  className?: string;
  label?: string;
  isPressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onHold?: () => void;
  onHoldEnd?: () => void;
  children: ReactNode;
};

// The one tap target with no look of its own. Layers above give it a layout through `className`.
export function Press({ className, label, isPressed, disabled, onClick, onHold, onHoldEnd, children }: PressProps) {
  const hold = useHold(disabled ? undefined : onHold, onHoldEnd);
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={isPressed}
      disabled={disabled}
      data-held={hold.isHeld}
      onClick={() => {
        if (hold.isTap.current) onClick();
      }}
      onPointerDown={hold.onPointerDown}
      onContextMenu={hold.onContextMenu}
    >
      {children}
    </button>
  );
}

type KeyRank = 'primary' | 'secondary' | 'destructive';

type TextKeyProps = {
  children: ReactNode;
  // The name a reader hears. A key that shows only an icon must have one (D104).
  label?: string;
  disabled?: boolean;
  isQuiet?: boolean;
  // primary: the one main action of a screen or sheet, filled. secondary: an action that opens or changes something
  // here, framed. destructive: an action that deletes or forgets, in the danger colour, never primary (D101). With
  // no rank the key is words only (D98).
  rank?: KeyRank;
  onClick: () => void;
};

export function TextKey({ children, label, disabled, isQuiet, rank, onClick }: TextKeyProps) {
  return (
    <button
      type="button"
      className="text-key"
      aria-label={label}
      data-quiet={isQuiet}
      data-rank={rank}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// The one main action of a form, in the same size as its fields.
export function ActionKey({ children, disabled, onClick }: Omit<TextKeyProps, 'isQuiet' | 'rank' | 'label'>) {
  return (
    <button type="button" className="action-key" disabled={disabled} onClick={onClick}>
      {children}
      <Icon.Fwd c="currentColor" />
    </button>
  );
}

type FileKeyProps = { children: ReactNode; accept: string; onFile: (file: File) => void };

// A key that asks for one file. The `input` stays hidden, because a file field cannot take a look.
export function FileKey({ children, accept, onFile }: FileKeyProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <TextKey onClick={() => input.current?.click()}>{children}</TextKey>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </>
  );
}

export function KeyRow({ children }: { children: ReactNode }) {
  return <div className="key-row">{children}</div>;
}

type WordKeyProps = { children: ReactNode; onClick: () => void };

export function LinkKey({ children, onClick }: WordKeyProps) {
  return (
    <button type="button" className="link-key" onClick={onClick}>
      {children}
    </button>
  );
}

export function AddKey({ children, disabled, onClick }: WordKeyProps & { disabled?: boolean }) {
  return (
    <button type="button" className="add-key" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function BackKey({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="back-key" onClick={onClick}>
      <Icon.Back c="currentColor" />
      {label}
    </button>
  );
}

type PowerKeyProps = {
  label: string;
  isOn: boolean;
  disabled?: boolean;
  onChange: (isOn: boolean) => void;
};

const POWER_RING = 'M7.5 6.2 A8 8 0 1 0 16.5 6.2';
const POWER_BAR = 'M12 2.5 V11';

// The power symbol in thin line. Off, it is dim. On, a bright line draws itself over it and glows (D99).
export function PowerKey({ label, isOn, disabled, onChange }: PowerKeyProps) {
  return (
    <Switch.Root className="power-key" aria-label={label} checked={isOn} disabled={disabled} onCheckedChange={onChange}>
      <svg className="power-symbol" viewBox="0 0 24 24" aria-hidden="true">
        <path className="power-symbol-base" pathLength={1} d={POWER_RING} />
        <path className="power-symbol-base" pathLength={1} d={POWER_BAR} />
        <path className="power-symbol-lit" pathLength={1} d={POWER_RING} />
        <path className="power-symbol-lit" pathLength={1} d={POWER_BAR} />
      </svg>
    </Switch.Root>
  );
}

type OptionRowProps<Value> = {
  label: string;
  options: { value: Value; name: string }[];
  value: Value;
  onChange: (value: Value) => void;
};

export function OptionRow<Value extends string | number>({ label, options, value, onChange }: OptionRowProps<Value>) {
  return (
    <div className="option-row" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className="option"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          <Picked isOn={option.value === value}>{option.name}</Picked>
        </button>
      ))}
    </div>
  );
}
