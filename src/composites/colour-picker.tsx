import { ColourPad, colourToHex, Fader, gradientOf, hexToColour, warmthToColour, type Colour } from '../design-system';

const EMBER_KELVIN = 1500;
const DAYLIGHT_KELVIN = 6500;
const WARMTH_STEPS = 40;

const warmthAt = (position: number) => warmthToColour(EMBER_KELVIN * (DAYLIGHT_KELVIN / EMBER_KELVIN) ** position);

const WARMTHS = Array.from({ length: WARMTH_STEPS + 1 }, (_, step) => step / WARMTH_STEPS);
const WARMTH_GRADIENT = gradientOf([0, 0.25, 0.5, 0.75, 1].map(warmthAt));

const distance = (one: Colour, other: Colour) =>
  Math.abs(one.r - other.r) + Math.abs(one.g - other.g) + Math.abs(one.b - other.b);

const closestWarmth = (colour: Colour) =>
  WARMTHS.reduce((best, next) => (distance(warmthAt(next), colour) < distance(warmthAt(best), colour) ? next : best));

type ColourPickerProps = { colour: string; onGrab: () => void; onChange: (colour: string) => void };

export function ColourPicker({ colour, onGrab, onChange }: ColourPickerProps) {
  return (
    <div className="colour-picker" onPointerDown={onGrab} onKeyDown={onGrab}>
      <ColourPad colour={colour} onChange={onChange} />
      <Fader
        label="White, warm to cool"
        value={closestWarmth(hexToColour(colour))}
        min={0}
        max={1}
        step={1 / WARMTH_STEPS}
        gradient={WARMTH_GRADIENT}
        onChange={(next) => onChange(colourToHex(warmthAt(next)))}
      />
    </div>
  );
}
