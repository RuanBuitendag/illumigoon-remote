import { useState } from 'react';
import {
  colourToHex,
  colourToHsv,
  Fader,
  gradientOf,
  hexToColour,
  hsvToColour,
  HUE_GRADIENT,
  OptionRow,
  warmthToColour,
  type Colour,
} from '../design-system';
import { ColourValue } from './control-rows';

const EMBER_KELVIN = 1500;
const DAYLIGHT_KELVIN = 6500;
const GREY_SATURATION = 0.35;

type AxesProps = { colour: Colour; onChange: (colour: Colour) => void };

type AxisProps = {
  label: string;
  value: number;
  max: number;
  gradient: string;
  onChange: (value: number) => void;
};

function Axis({ label, value, max, gradient, onChange }: AxisProps) {
  return <Fader label={label} value={value} min={0} max={max} step={max / 200} gradient={gradient} onChange={onChange} />;
}

const warmthAt = (position: number) => warmthToColour(EMBER_KELVIN * (DAYLIGHT_KELVIN / EMBER_KELVIN) ** position);

const WARMTH_GRADIENT = gradientOf([0, 0.25, 0.5, 0.75, 1].map(warmthAt));

function WarmthAxes({ onChange }: AxesProps) {
  const [position, setPosition] = useState(0.5);
  return (
    <>
      <Axis
        label="Warmth"
        value={position}
        max={1}
        gradient={WARMTH_GRADIENT}
        onChange={(next) => {
          setPosition(next);
          onChange(warmthAt(next));
        }}
      />
      <p className="axis-ends">
        <span>EMBER</span>
        <span>DAYLIGHT</span>
      </p>
    </>
  );
}

function HsvAxes({ colour, onChange }: AxesProps) {
  const { h, s, v } = colourToHsv(colour);
  const [hue, setHue] = useState(h);
  const at = (next: { s: number; v: number }) => hsvToColour({ h: hue, ...next });
  return (
    <>
      <Axis
        label="Hue"
        value={hue}
        max={360}
        gradient={HUE_GRADIENT}
        onChange={(next) => {
          setHue(next);
          onChange(hsvToColour({ h: next, s, v }));
        }}
      />
      <Axis
        label="Saturation"
        value={s}
        max={1}
        gradient={gradientOf([at({ s: 0, v }), at({ s: 1, v })])}
        onChange={(next) => onChange(at({ s: next, v }))}
      />
      <Axis
        label="Brightness"
        value={v}
        max={1}
        gradient={gradientOf([at({ s, v: 0 }), at({ s, v: 1 })])}
        onChange={(next) => onChange(at({ s, v: next }))}
      />
    </>
  );
}

const CHANNELS = [
  { key: 'r', label: 'Red' },
  { key: 'g', label: 'Green' },
  { key: 'b', label: 'Blue' },
] as const;

function RgbAxes({ colour, onChange }: AxesProps) {
  return (
    <>
      {CHANNELS.map(({ key, label }) => (
        <Axis
          key={key}
          label={label}
          value={colour[key]}
          max={255}
          gradient={gradientOf([
            { ...colour, [key]: 0 },
            { ...colour, [key]: 255 },
          ])}
          onChange={(next) => onChange({ ...colour, [key]: Math.round(next) })}
        />
      ))}
    </>
  );
}

const AXES = { warmth: WarmthAxes, hsv: HsvAxes, rgb: RgbAxes };

type ColourAxesProps = { colour: string; onChange: (colour: string) => void };

export function ColourAxes({ colour, onChange }: ColourAxesProps) {
  const parsed = hexToColour(colour);
  const [axes, setAxes] = useState<keyof typeof AXES>(() =>
    colourToHsv(parsed).s < GREY_SATURATION ? 'warmth' : 'hsv',
  );
  const Axes = AXES[axes];
  return (
    <div className="colour-custom">
      <ColourValue colour={colour} />
      <OptionRow
        label="Kind of slider"
        options={[
          { value: 'warmth', name: 'Warmth' },
          { value: 'hsv', name: 'HSV' },
          { value: 'rgb', name: 'RGB' },
        ]}
        value={axes}
        onChange={setAxes}
      />
      <Axes colour={parsed} onChange={(next) => onChange(colourToHex(next))} />
    </div>
  );
}
