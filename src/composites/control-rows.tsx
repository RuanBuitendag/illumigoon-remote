import type { ReactNode } from 'react';
import { Fader, OptionRow, PowerKey, TextKey, ValueText } from '../design-system';

function ControlLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="control-line">
      <span className="control-label">{label}</span>
      {children}
    </div>
  );
}

type SliderRowProps = {
  label: string;
  valueText: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

export function SliderRow({ label, valueText, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="control-stack">
      <span className="control-label">
        {label}
        <ValueText>{valueText}</ValueText>
      </span>
      <Fader label={label} value={value} min={min} max={max} step={step} onChange={onChange} />
    </div>
  );
}

type StepperRowProps = {
  label: string;
  valueText: string;
  onStep: (direction: -1 | 1) => void;
};

export function StepperRow({ label, valueText, onStep }: StepperRowProps) {
  return (
    <ControlLine label={label}>
      <span className="stepper">
        <TextKey onClick={() => onStep(-1)}>−</TextKey>
        <ValueText>{valueText}</ValueText>
        <TextKey onClick={() => onStep(1)}>+</TextKey>
      </span>
    </ControlLine>
  );
}

type SelectRowProps<Value> = {
  label: string;
  options: { value: Value; name: string }[];
  value: Value;
  onChange: (value: Value) => void;
};

export function SelectRow<Value extends string | number>({ label, options, value, onChange }: SelectRowProps<Value>) {
  return (
    <div className="control-stack">
      <span className="control-label">{label}</span>
      <OptionRow label={label} options={options} value={value} onChange={onChange} />
    </div>
  );
}

type ToggleRowProps = {
  label: string;
  isOn: boolean;
  disabled?: boolean;
  onChange: (isOn: boolean) => void;
};

export function ToggleRow({ label, isOn, disabled, onChange }: ToggleRowProps) {
  return (
    <ControlLine label={label}>
      <PowerKey label={label} isOn={isOn} disabled={disabled} onChange={onChange} />
    </ControlLine>
  );
}

export function HeadingRow({ heading, children }: { heading: ReactNode; children?: ReactNode }) {
  return (
    <div className="heading-row">
      {heading}
      {children}
    </div>
  );
}
