import { Slider } from '@base-ui/react/slider';
import { useRef, useState, type PointerEvent, type ReactNode, type Ref } from 'react';

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
  // Relative travel, for Edit: a drag moves the value from where it was, a full sweep is the bar's own
  // width, and shift makes it ten times finer. A tap that does not move sets the value where it landed.
  isRelative?: boolean;
};

// Further than this, in pixels, and a press is a drag, not a tap.
const TAP_SLOP = 4;
const FINE = 0.1;

type Drag = { x: number; left: number; from: number; width: number; isMoved: boolean };

// The bar takes the pointer before Base UI does, so a press does not jump the value. The keys stay Base UI's.
function useRelativeDrag({ value, min, max, disabled, onChange, onCommit }: FaderProps) {
  const drag = useRef<Drag | null>(null);
  const setAt = (part: number) => onChange(min + Math.min(1, Math.max(0, part)) * (max - min));
  return {
    onPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
      if (disabled || event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const { left, width } = event.currentTarget.getBoundingClientRect();
      drag.current = { x: event.clientX, left, from: (value - min) / (max - min), width: width || 1, isMoved: false };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const held = drag.current;
      if (!held || (!held.isMoved && Math.abs(event.clientX - held.x) < TAP_SLOP)) return;
      held.isMoved = true;
      setAt(held.from + ((event.clientX - held.x) / held.width) * (event.shiftKey ? FINE : 1));
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const held = drag.current;
      if (!held) return;
      drag.current = null;
      if (!held.isMoved) setAt((event.clientX - held.left) / held.width);
      onCommit?.();
    },
    onPointerCancel() {
      if (!drag.current) return;
      drag.current = null;
      onCommit?.();
    },
  };
}

// The one fader, in the app and in Edit: a fine track and its fill. While a finger is down the bar
// follows it, and outside values wait until it lets go.
export function Fader(props: FaderProps) {
  const { label, value, min, max, step, disabled, isLit = true, gradient, halo, valueText, title, children } = props;
  const { onChange, onCommit, onReset, isRelative } = props;
  const [draft, setDraft] = useState<number | null>(null);
  const relativeDrag = useRelativeDrag(props);
  return (
    <Slider.Root
      {...(isRelative ? relativeDrag : {})}
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
