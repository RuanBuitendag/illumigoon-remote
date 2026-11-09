import { useEffect, useRef, type RefObject } from 'react';
import {
  addStrip,
  playRecording,
  removeStrip,
  type Strip,
  type StripRecording,
  type StripShape,
} from './led-strip-player';

const SHAPES = {
  room: { padding: 14, spread: 3.2, glow: 1 },
  tile: { padding: 8, spread: 2.6, glow: 0.75, isSlow: true },
  line: { padding: 4, spread: 1.6, glow: 0.6 },
} satisfies Record<string, StripShape>;

type LedStripProps = {
  recording: StripRecording | null;
  shape: keyof typeof SHAPES;
  isOn?: boolean;
  brightness?: number;
  // When the light last refused a change: the strip shakes once at each new time (D110).
  refusedAt?: number;
  onFirstView: () => void;
};

function replay(canvas: HTMLCanvasElement, feedback: 'took' | 'refused') {
  canvas.removeAttribute('data-feedback');
  void canvas.offsetWidth;
  canvas.setAttribute('data-feedback', feedback);
}

// A room's strip glows once when a new look starts on it: the one big moment of the app (D107). The first
// recording is the look already there, so it does not glow.
function useLookStartGlow(canvasRef: RefObject<HTMLCanvasElement | null>, recording: StripRecording | null) {
  const shown = useRef<StripRecording | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const before = shown.current;
    if (recording) shown.current = recording;
    if (!canvas || !recording || !before || before === recording) return;
    replay(canvas, 'took');
  }, [canvasRef, recording]);
}

function useRefusedShake(canvasRef: RefObject<HTMLCanvasElement | null>, refusedAt: number) {
  const shown = useRef(refusedAt);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || refusedAt === shown.current) return;
    shown.current = refusedAt;
    replay(canvas, 'refused');
  }, [canvasRef, refusedAt]);
}

export function LedStrip({ recording, shape, isOn = true, brightness = 1, refusedAt = 0, onFirstView }: LedStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<Strip | null>(null);
  const onFirstViewRef = useRef(onFirstView);

  useEffect(() => {
    onFirstViewRef.current = onFirstView;
  }, [onFirstView]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const strip = addStrip(canvasRef.current, SHAPES[shape], () => onFirstViewRef.current());
    stripRef.current = strip;
    return () => {
      removeStrip(strip);
      stripRef.current = null;
    };
  }, [shape]);

  useEffect(() => {
    if (stripRef.current && recording) playRecording(stripRef.current, recording);
  }, [recording]);
  useLookStartGlow(canvasRef, shape === 'room' ? recording : null);
  useRefusedShake(canvasRef, refusedAt);

  useEffect(() => {
    if (!stripRef.current) return;
    stripRef.current.isOn = isOn;
    stripRef.current.brightness = brightness;
  }, [isOn, brightness]);

  return (
    <canvas
      ref={canvasRef}
      className={`led-strip led-strip-${shape}`}
      data-loading={recording === null}
      aria-hidden="true"
    />
  );
}
