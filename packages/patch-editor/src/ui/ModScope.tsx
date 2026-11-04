/**
 * What a modulator is doing, on its tile, read from the preview engine (LIFE-1961).
 *
 * A short rolling trace of the slot's output, the last `SECONDS` of it, with a tick for each frame
 * the slot fired on. A trigger node draws its ticks bright and its value faint; a continuous node
 * draws only the trace; a Periodic draws only ticks (see `showsOf`). A Periodic with Randomness
 * shows uneven ticks, and one at Chance below 1 shows gaps where a lap did not fire.
 *
 * FROM THE ENGINE, NOT A COPY. `readModulator` asks the same WebAssembly engine that draws the
 * preview strip, so the picture is what the engine computed: an audio band, a threshold and an
 * envelope move here too, where a TypeScript imitation could only leave them blank.
 *
 * Written by the shared animation loop, never by React, for the reason `live.ts` gives.
 */

import { useEffect, useRef } from 'react';
import { nodeById } from '../domain/catalog';
import type { Modulator } from '../domain/patch';
import { readModulator } from '../engine/preview';
import { onFrame } from './live';
import { useLatest } from './useLatest';

/** How much history a tile holds. Enough for two laps of a one-second Periodic. */
const SECONDS = 2.5;
/** Samples kept, one per drawn frame at 60 Hz. */
const SAMPLES = Math.round(SECONDS * 60);
/** Frames between two reads of the colour tokens. */
const INK_EVERY = 30;

type Ink = { trace: string; faint: string; tick: string; base: string };

type History = { values: (number | undefined)[]; fired: boolean[]; fires: number | null };

const emptyHistory = (): History => ({ values: [], fired: [], fires: null });

/** One frame's reading, pushed onto the ring. A count that went down is a rebuilt node, not a fire. */
function record(h: History, slot: number, bipolar: boolean): boolean {
  const read = readModulator(slot);
  if (!read) return false;
  const v = read.value === undefined ? undefined : bipolar ? read.value * 0.5 + 0.5 : read.value;
  h.values.push(v === undefined ? undefined : Math.min(1, Math.max(0, v)));
  h.fired.push(h.fires !== null && read.fires > h.fires);
  h.fires = read.fires;
  if (h.values.length > SAMPLES) { h.values.shift(); h.fired.shift(); }
  return true;
}

/** A canvas and the size it is laid out at, in CSS pixels. */
type Pen = { ctx: CanvasRenderingContext2D; w: number; ht: number };

function drawTrace({ ctx, w, ht }: Pen, h: History, ink: string) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let pen = false;
  const step = w / (SAMPLES - 1);
  const x0 = w - (h.values.length - 1) * step;
  h.values.forEach((v, i) => {
    if (v === undefined) { pen = false; return; }
    const x = x0 + i * step;
    const y = 1 + (ht - 2) * (1 - v);
    if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    pen = true;
  });
  ctx.stroke();
}

function drawTicks({ ctx, w, ht }: Pen, h: History, ink: string) {
  ctx.fillStyle = ink;
  const step = w / (SAMPLES - 1);
  const x0 = w - (h.fired.length - 1) * step;
  h.fired.forEach((f, i) => { if (f) ctx.fillRect(Math.round(x0 + i * step) - 1, 0, 2, ht); });
}

/**
 * What a tile draws. A trigger node draws its ticks. A node whose value is only its lap position,
 * which is Periodic, draws no trace: the ramp drops once a lap, and that drop looks like a tick,
 * so a lap that did not fire would look the same as one that did.
 */
type Shows = { ticks: boolean; trace: boolean };

const showsOf = (type: string, trigger: boolean): Shows => ({ ticks: trigger, trace: type !== 'periodic' });

function draw(pen: Pen, h: History, shows: Shows, ink: Ink) {
  const { ctx, w, ht } = pen;
  ctx.clearRect(0, 0, w, ht);
  ctx.fillStyle = ink.base;
  ctx.fillRect(0, ht - 1, w, 1);
  if (shows.trace) drawTrace(pen, h, shows.ticks ? ink.faint : ink.trace);
  if (shows.ticks) drawTicks(pen, h, ink.tick);
}

function inkOf(el: HTMLElement): Ink {
  const css = getComputedStyle(el);
  const tok = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    trace: tok('--modulation-soft', '#ecebe7'),
    faint: tok('--text-5', '#5f6064'),
    tick: tok('--modulation', '#ecebe7'),
    base: tok('--text-5', '#5f6064'),
  };
}

/** Matches the canvas's backing store to its laid-out size, so lines stay sharp at any width. */
function fit(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Pen {
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth;
  const ht = c.clientHeight;
  c.width = Math.round(w * dpr);
  c.height = Math.round(ht * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, ht };
}

export function ModScope({ mod }: { mod: Modulator }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const held = useLatest(mod);
  const node = nodeById(mod.type);
  const trigger = node?.trigger === true;
  const bipolar = node?.bipolar === true;
  // A new node in the slot starts a new picture: the old history is a different thing's.
  const key = `${mod.slot}:${mod.type}`;

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const shows = showsOf(held.current.type, trigger);
    let pen = fit(c, ctx);
    let ink = inkOf(c);
    let frames = 0;
    const resize = new ResizeObserver(() => { pen = fit(c, ctx); });
    resize.observe(c);
    const history = emptyHistory();
    const stop = onFrame(() => {
      // The colours are tokens, and the theme can change under an open editor: read them again
      // about twice a second rather than on every frame.
      if (++frames % INK_EVERY === 0) ink = inkOf(c);
      if (record(history, held.current.slot, bipolar)) draw(pen, history, shows, ink);
    });
    return () => { stop(); resize.disconnect(); };
  }, [key, held, trigger, bipolar]);

  return <canvas ref={canvas} className="modscope" aria-hidden="true" data-slot={mod.slot} />;
}
