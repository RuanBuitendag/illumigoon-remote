/**
 * A light, moving: one cell per LED, from a loop the firmware's patch engine recorded
 * (`engine/thumbs.ts`).
 *
 * The same picture the preview strip draws, lit tape from `ledPaint.ts`, at a size that fits in
 * a list.
 *
 * PLAYED FROM ONE CLOCK. Every strip paints the same moment of `live.ts`'s shared loop, so two
 * tiles running one document move together. The recording holds about 15 frames a second, and a
 * strip eases between them at `PAINT_FPS` while it is in view. `live={false}` holds the first
 * frame -- for the smallest strips, where motion is noise -- and so does a viewer who asked for
 * reduced motion.
 *
 * Dark until the recording lands, and dark for a document the engine cannot draw: a flat
 * animation, or no engine built. Unlit tape says "nothing to show", which is true; a placeholder
 * colour would say something about the light that is not.
 */

import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { Animation } from '../domain/house';
import { PREVIEW_PIXELS } from '../engine/preview';
import { FILM_FPS, readThumb, requestThumb, thumbKey } from '../engine/thumbs';
import { createLedPainter, readRgba, type LedShape } from './ledPaint';
import { onFrame } from './live';

const PAINT_FPS = 20;
const QUIET: LedShape = { padding: 8, spread: 2.6, glow: 0.75 };
const LIT: LedShape = { padding: 8, spread: 3.2, glow: 1 };

const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function LedStrip({ animation, height = 8, glow = false, dim = false, live = true, title }: {
  animation: Animation | null;
  height?: number;
  glow?: boolean;
  dim?: boolean;
  live?: boolean;
  title?: string;
}) {
  const key = useMemo(() => (animation ? thumbKey(animation) : null), [animation]);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!key || !animation) return;
    return requestThumb(key, animation, redraw);
    // The key is the document's identity; a new object with the same JSON is the same request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const film = key ? readThumb(key) : null;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const { pixels, paint } = createLedPainter(el, glow ? LIT : QUIET);
    if (film) readRgba(pixels, film.frames);
    paint();
    const resize = new ResizeObserver(() => paint());
    resize.observe(el);

    let inView = true;
    const view = new IntersectionObserver(changes => {
      inView = changes.at(-1)?.isIntersecting ?? inView;
    });
    view.observe(el);

    const px = PREVIEW_PIXELS * 4;
    let shown = -1;
    // The picture still comes from `t`. This only spreads the strips over the frames of a tick, so
    // a long list never paints in one frame.
    const turn = Math.random();
    const play = (t: number) => {
      const tick = Math.floor(t * PAINT_FPS + turn);
      if (!film || !inView || tick === shown) return;
      shown = tick;
      const at = (t * FILM_FPS) % film.count;
      const from = Math.floor(at);
      const to = ((from + 1) % film.count) * px;
      readRgba(pixels, film.frames, { from: from * px, to, mix: at - from });
      paint();
    };
    const moving = film && live && film.count > 1 && !reducedMotion();
    const stop = moving ? onFrame(play) : undefined;
    return () => { stop?.(); resize.disconnect(); view.disconnect(); };
  }, [film, glow, live]);

  return (
    <div className={`led${dim ? ' dim' : ''}`} style={{ height }} title={title}>
      <canvas ref={canvas} />
    </div>
  );
}
