import type { ReactNode } from 'react';
import { ColourRow, PaletteRow, SelectRow, SliderRow, StepperRow, ToggleRow } from '../../composites';
import { colourToHex, type Colour } from '../../design-system';
import type { Parameter, ParameterValue } from '../light-network/protocol';

type ControlProps = {
  parameter: Parameter;
  onChange: (value: ParameterValue) => void;
  onEditColours: () => void;
};

const shownValue = (value: number) => String(Number(value.toFixed(2)));

function SliderControl({ parameter, onChange }: ControlProps) {
  const value = parameter.default as number;
  return (
    <SliderRow
      label={parameter.label}
      valueText={shownValue(value)}
      value={value}
      min={parameter.min ?? 0}
      max={parameter.max ?? 1}
      step={parameter.step ?? 0.01}
      onChange={onChange}
    />
  );
}

function StepperControl({ parameter, onChange }: ControlProps) {
  const value = parameter.default as number;
  const { min = value, max = value, step = 1 } = parameter;
  const stepBy = (direction: number) => onChange(Math.min(max, Math.max(min, value + direction * step)));
  return <StepperRow label={parameter.label} valueText={shownValue(value)} onStep={stepBy} />;
}

function SelectControl({ parameter, onChange }: ControlProps) {
  const options = (parameter.options ?? []).map((name, value) => ({ name, value }));
  return (
    <SelectRow label={parameter.label} options={options} value={parameter.default as number} onChange={onChange} />
  );
}

function ToggleControl({ parameter, onChange }: ControlProps) {
  return <ToggleRow label={parameter.label} isOn={Boolean(parameter.default)} onChange={onChange} />;
}

function ColourControl({ parameter, onEditColours }: ControlProps) {
  const colour = colourToHex(parameter.default as Colour);
  return <ColourRow label={parameter.label} colour={colour} onOpen={onEditColours} />;
}

function PaletteControl({ parameter, onEditColours }: ControlProps) {
  const colours = (parameter.default as Colour[]).map(colourToHex);
  return <PaletteRow label={parameter.label} colours={colours} onOpen={onEditColours} />;
}

const CONTROLS: Record<string, (props: ControlProps) => ReactNode> = {
  slider: SliderControl,
  stepper: StepperControl,
  select: SelectControl,
  toggle: ToggleControl,
  color_picker: ColourControl,
  palette: PaletteControl,
};

export function LookControl(props: ControlProps) {
  const Control = CONTROLS[props.parameter.type];
  return Control ? <Control {...props} /> : null;
}
