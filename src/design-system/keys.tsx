import { Switch } from '@base-ui/react/switch';
import type { ReactNode } from 'react';
import { ChevronMark } from './marks';

type PressProps = {
  className?: string;
  label?: string;
  isPressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

// The one tap target with no look of its own. Layers above give it a layout through `className`.
export function Press({ className, label, isPressed, disabled, onClick, children }: PressProps) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={isPressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type TextKeyProps = {
  children: ReactNode;
  disabled?: boolean;
  isQuiet?: boolean;
  onClick: () => void;
};

export function TextKey({ children, disabled, isQuiet, onClick }: TextKeyProps) {
  return (
    <button type="button" className="text-key" data-quiet={isQuiet} disabled={disabled} onClick={onClick}>
      {children}
    </button>
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

export function AddKey({ children, onClick }: WordKeyProps) {
  return (
    <button type="button" className="add-key" onClick={onClick}>
      {children}
    </button>
  );
}

export function BackKey({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="back-key" onClick={onClick}>
      <ChevronMark direction="left" />
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

export function PowerKey({ label, isOn, disabled, onChange }: PowerKeyProps) {
  return (
    <Switch.Root
      className="power-key"
      aria-label={label}
      checked={isOn}
      disabled={disabled}
      onCheckedChange={onChange}
    >
      <span className="power-key-bar" />
      <span className="power-key-label">{isOn ? 'ON' : 'OFF'}</span>
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
          {option.name}
        </button>
      ))}
    </div>
  );
}
