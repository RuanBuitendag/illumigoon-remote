import type { ReactNode } from 'react';
import type { Colour, Parameter, ParameterValue } from '../light-network/protocol';
import { LevelSlider } from './level-slider';
import { PowerSwitch } from './power-switch';

const toHex = ({ r, g, b }: Colour) =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;

function toColour(hex: string): Colour {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return { r: channel(1), g: channel(3), b: channel(5) };
}

type ControlProps = {
  parameter: Parameter;
  onChange: (value: ParameterValue) => void;
};

function SliderControl({ parameter, onChange }: ControlProps) {
  return (
    <LevelSlider
      label={parameter.label}
      value={parameter.default as number}
      min={parameter.min ?? 0}
      max={parameter.max ?? 1}
      step={parameter.step ?? 0.01}
      onChange={onChange}
    />
  );
}

function SelectControl({ parameter, onChange }: ControlProps) {
  return (
    <select
      aria-label={parameter.label}
      value={parameter.default as number}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {parameter.options?.map((option, index) => (
        <option key={option} value={index}>
          {option}
        </option>
      ))}
    </select>
  );
}

function ColourControl({ parameter, onChange }: ControlProps) {
  return (
    <input
      aria-label={parameter.label}
      type="color"
      value={toHex(parameter.default as Colour)}
      onChange={(event) => onChange(toColour(event.target.value))}
    />
  );
}

function PaletteControl({ parameter, onChange }: ControlProps) {
  const colours = parameter.default as Colour[];
  const replace = (position: number, colour: Colour) =>
    colours.map((existing, index) => (index === position ? colour : existing));
  return (
    <div className="palette">
      {colours.map((colour, index) => (
        <input
          key={`${parameter.key}-${index}`}
          aria-label={`${parameter.label} ${index + 1}`}
          type="color"
          value={toHex(colour)}
          onChange={(event) => onChange(replace(index, toColour(event.target.value)))}
        />
      ))}
    </div>
  );
}

function ToggleControl({ parameter, onChange }: ControlProps) {
  return <PowerSwitch label={parameter.label} checked={Boolean(parameter.default)} onChange={onChange} />;
}

const CONTROLS: Record<string, (props: ControlProps) => ReactNode> = {
  slider: SliderControl,
  stepper: SliderControl,
  select: SelectControl,
  toggle: ToggleControl,
  color_picker: ColourControl,
  palette: PaletteControl,
};

export function LookControl({ parameter, onChange }: ControlProps) {
  const Control = CONTROLS[parameter.type];
  if (!Control) return null;
  return (
    <div className="look-control">
      <span>{parameter.label}</span>
      <Control parameter={parameter} onChange={onChange} />
    </div>
  );
}
