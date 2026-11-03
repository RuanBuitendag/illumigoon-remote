import { Slider } from '@base-ui/react/slider';
import { useState, type ReactNode, type Ref } from 'react';

type FaderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  // The fill is bright while what it sets is live: a light that is on, the layer being worked on.
  isLit?: boolean;
  // A bar painted with the colours it picks from, such as hue. It draws a thumb, as it has no fill.
  gradient?: string;
  // A ring round the track while a modulator is carried: it could bind here (armed), it is over this
  // bar (hot), or the slot under the pointer drives this bar (driven).
  halo?: 'armed' | 'hot' | 'driven';
  // What a screen reader says for the value, when the number alone is not it.
  valueText?: string;
  title?: string;
  // Marks along the track: a FaderBand for what a modulator makes the value reach, a FaderDot for where
  // it has it now.
  children?: ReactNode;
  onChange: (value: number) => void;
  // When a drag or a key lets go, so the caller can write at once what it gathered.
  onCommit?: () => void;
  // A double click puts the default back.
  onReset?: () => void;
};

// The one fader, in the app and in Edit: a fine track and its fill. While a finger is down the bar
// follows it, and outside values wait until it lets go.
export function Fader(props: FaderProps) {
  const { label, value, min, max, step, disabled, isLit = true, gradient, halo, valueText, title, children } = props;
  const { onChange, onCommit, onReset } = props;
  const [draft, setDraft] = useState<number | null>(null);
  return (
    <Slider.Root
      className="fader"
      aria-label={label}
      title={title}
      data-lit={isLit}
      data-gradient={Boolean(gradient)}
      data-halo={halo}
      value={draft ?? value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(next) => {
        setDraft(next as number);
        onChange(next as number);
      }}
      onValueCommitted={() => {
        setDraft(null);
        onCommit?.();
      }}
      onDoubleClick={onReset}
    >
      <Slider.Control className="fader-control">
        <Slider.Track className="fader-track" style={gradient ? { background: gradient } : undefined}>
          <Slider.Indicator className="fader-fill" />
          <Slider.Thumb
            className="fader-thumb"
            aria-label={label}
            getAriaValueText={valueText ? () => valueText : undefined}
          />
        </Slider.Track>
        {children}
      </Slider.Control>
    </Slider.Root>
  );
}

// What a modulator makes the value reach, from and to as parts of the track.
export function FaderBand({ from, to, isInert }: { from: number; to: number; isInert?: boolean }) {
  const place = { left: `${from * 100}%`, width: `${(to - from) * 100}%` };
  return <span className="fader-band" data-inert={isInert} style={place} />;
}

// Where a modulator has the value now. It is moved by its owner, a frame at a time, through `ref`.
export function FaderDot({ ref }: { ref: Ref<HTMLSpanElement> }) {
  return <span className="fader-dot" ref={ref} style={{ display: 'none' }} />;
}
