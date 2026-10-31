import { Slider } from '@base-ui/react/slider';
import { useState } from 'react';

type FaderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  isLit?: boolean;
  gradient?: string;
  onChange: (value: number) => void;
};

// While a thumb is down it follows the finger, and outside values wait until it lets go.
export function Fader({ label, value, min, max, step, disabled, isLit = true, gradient, onChange }: FaderProps) {
  const [draft, setDraft] = useState<number | null>(null);
  return (
    <Slider.Root
      className="fader"
      aria-label={label}
      data-lit={isLit}
      data-gradient={Boolean(gradient)}
      value={draft ?? value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(next) => {
        setDraft(next as number);
        onChange(next as number);
      }}
      onValueCommitted={() => setDraft(null)}
    >
      <Slider.Control className="fader-control">
        <span className="fader-ticks" />
        <Slider.Track className="fader-track" style={gradient ? { background: gradient } : undefined}>
          <Slider.Indicator className="fader-fill" />
          <Slider.Thumb className="fader-thumb" aria-label={label} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
