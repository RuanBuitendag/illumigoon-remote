import { useEffect, useRef } from 'react';
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
  hero: { padding: 20, spread: 5, chipSize: 3.4, glow: 1.25 },
  tile: { padding: 8, spread: 2.6, glow: 0.75, isSlow: true },
} satisfies Record<string, StripShape>;

type LedStripProps = {
  recording: StripRecording | null;
  shape: keyof typeof SHAPES;
  isOn?: boolean;
  brightness?: number;
  onFirstView: () => void;
};

export function LedStrip({ recording, shape, isOn = true, brightness = 1, onFirstView }: LedStripProps) {
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

  useEffect(() => {
    if (!stripRef.current) return;
    stripRef.current.isOn = isOn;
    stripRef.current.brightness = brightness;
  }, [isOn, brightness]);

  return <canvas ref={canvasRef} className={`led-strip led-strip-${shape}`} aria-hidden="true" />;
}
