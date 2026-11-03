/**
 * What an audio band is hearing, drawn under its knobs.
 *
 * TWO PANES, NOT ONE, because the node's two knobs act on two different signals
 * (`domain/scope.ts`): the top pane is the band's raw level with Threshold drawn on it, the bottom
 * is the level after auto-gain and Sensitivity with Squelch drawn on it, and what the node puts
 * out over that. A threshold line on the post-gain trace would sit against a signal it never
 * touches, and look like it did nothing.
 *
 * THE LIGHT STREAMS ONLY WHILE THIS IS OPEN. Mounting holds `feed.listen()` and unmounting lets
 * go; a light forgets a subscription nobody renews on its own, so a closed editor costs it nothing.
 *
 * Painted from the shared frame loop (`live.ts`), never through React, like the strips. The
 * knob values are read through a ref, so turning Threshold moves its line on the next frame
 * without rebuilding the loop.
 */

import { useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { SCOPE_SECONDS, type AudioFeed, type Series } from '../domain/scope';
import { Lab } from './bits';
import { onFrame } from './live';

const W = 300;
const PANE = 46;
const GAP = 18;
const H = PANE * 2 + GAP;

/** Nothing for this long, after something, is a light that stopped streaming. */
const QUIET_AFTER_MS = 2500;

type Ink = Record<'raw' | 'norm' | 'out' | 'warn' | 'accent' | 'well', string>;

function trace(ctx: CanvasRenderingContext2D, v: number[] | undefined, cap: number,
               pen: { y: (x: number) => number; colour: string; width?: number }) {
  if (!v || v.length < 2) return;
  const { y } = pen;
  const step = W / Math.max(1, cap - 1);
  ctx.strokeStyle = pen.colour;
  ctx.lineWidth = pen.width ?? 1;
  ctx.beginPath();
  let down = false;
  for (let i = 0; i < v.length; i++) {
    const val = v[i];
    // A hole is a gap in the line, never a line across it.
    if (val === undefined || !Number.isFinite(val)) { down = false; continue; }
    const px = W - (v.length - 1 - i) * step;
    const py = y(val);
    if (down) ctx.lineTo(px, py);
    else { ctx.moveTo(px, py); down = true; }
  }
  ctx.stroke();
}

function level(ctx: CanvasRenderingContext2D, y: number, colour: string) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, Math.round(y) + 0.5);
  ctx.lineTo(W, Math.round(y) + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
}

function draw(ctx: CanvasRenderingContext2D, s: Series | null, rate: number,
              { knobs, ink }: { knobs: { threshold: number; squelch: number }; ink: Ink }) {
  const cap = Math.max(2, Math.round(SCOPE_SECONDS * rate));
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = ink.well;
  ctx.fillRect(0, 0, W, PANE);
  ctx.fillRect(0, PANE + GAP, W, PANE);

  // The raw band is tiny next to 1.0 in a quiet room, so its pane scales to what was heard --
  // and never so far that the Threshold line falls off the top.
  let peak = knobs.threshold;
  if (s) for (const v of s.raw) if (v > peak) peak = v;
  const top = Math.max(0.02, peak * 1.15);
  const yRaw = (v: number) => PANE - 2 - (Math.min(Math.max(v, 0), top) / top) * (PANE - 4);
  trace(ctx, s?.raw, cap, { y: yRaw, colour: ink.raw });
  level(ctx, yRaw(knobs.threshold), ink.warn);

  const yGain = (v: number) => PANE + GAP + PANE - 2 - Math.min(Math.max(v, 0), 1) * (PANE - 4);
  trace(ctx, s?.norm, cap, { y: yGain, colour: ink.norm });
  trace(ctx, s?.out, cap, { y: yGain, colour: ink.out, width: 1.5 });
  level(ctx, yGain(knobs.squelch), ink.accent);
}

export function BandScope({ feed, slot, threshold, squelch }: {
  feed: AudioFeed;
  slot: number;
  threshold: number;
  squelch: number;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const knobs = useLatest({ threshold, squelch });
  const [heard, setHeard] = useState<'waiting' | 'live' | 'quiet' | 'noband'>('waiting');

  useEffect(() => feed.listen(), [feed]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const css = getComputedStyle(c);
    const tok = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const ink: Ink = {
      raw: tok('--text-3', '#a3a29e'),
      norm: tok('--text-5', '#5f6064'),
      out: tok('--text-1', '#ecebe7'),
      warn: tok('--warn', '#c9954a'),
      accent: tok('--modulation-soft', '#ecebe7'),
      well: tok('--background', '#09090a'),
    };
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let said = '';
    return onFrame(() => {
      const h = feed.history;
      const now = Date.now();
      // The stream first, then the band: samples arriving with no frame for any band is a light
      // that
      // heard the request and is not running this node, which asking again will not change.
      const quiet = (at: number | null) => at === null || now - at > QUIET_AFTER_MS;
      const state = h.heardAt === null ? 'waiting'
        : quiet(h.heardAt) ? 'quiet'
        : quiet(h.lastAt) ? 'noband'
        : 'live';
      if (state !== said) { said = state; setHeard(state); }
      draw(ctx, h.series(slot), h.rate, { knobs: knobs.current, ink });
    });
  }, [feed, slot, knobs]);

  return (
    <div className="col scope">
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Lab className="mid">Hearing</Lab>
        <span className="grow" />
        <span className={`tilenote${heard === 'quiet' || heard === 'noband' ? ' warn' : ''}`}>
          {heard === 'waiting'
            ? 'asking the light for its microphone…'
            : heard === 'quiet'
              ? 'nothing from the light — is its microphone running?'
              : heard === 'noband'
                ?
                  'the light is listening, but not running this band — is it on, and did the ' +
                  'edit land?'
                : `live · last ${SCOPE_SECONDS} s`}
        </span>
      </div>
      <div className="scopebox" style={{ width: W, height: H }}>
        <canvas ref={canvas} style={{ width: W, height: H }} />
        <span className="scopecap" style={{ top: 3 }}>
          band <i className="dash warn" /> threshold
        </span>
        <span className="scopecap" style={{ top: PANE + GAP + 3 }}>
          after gain · <b>out</b> <i className="dash accent" /> squelch
        </span>
      </div>
    </div>
  );
}
