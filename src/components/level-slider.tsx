import { Slider } from '@base-ui/react/slider';
import { useState } from 'react';

type LevelSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

// While a thumb is down it follows the finger, and values from the light wait until it lets go.
export function LevelSlider({ label, value, min, max, step, disabled, onChange }: LevelSliderProps) {
  const [draft, setDraft] = useState<number | null>(null);
  return (
    <Slider.Root
      className="level-slider"
      aria-label={label}
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
      <Slider.Control className="level-slider-control">
        <Slider.Track className="level-slider-track">
          <Slider.Indicator className="level-slider-indicator" />
          <Slider.Thumb className="level-slider-thumb" aria-label={label} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
