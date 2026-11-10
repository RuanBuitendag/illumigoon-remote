import { useEffect, useRef } from 'react';

// Depth from the strips' own light, a trial behind a setting (LIFE-2015). Each effect sets one attribute on <html>,
// and the rules in design-system.css and composites.css hang on it, so the effects reach every screen.
export type DepthEffects = {
  /** A blurred copy of the strips on the screen lights the page, as the LEDs light a wall. */
  glow: boolean;
  /** Sheets, menus and bars are glass over the lit page. */
  glass: boolean;
  /** The power symbol and the playing look glow in the colour of the look. */
  litKeys: boolean;
  /** A fine film grain, and the black falls away at the edges. */
  grain: boolean;
};

const ATTRIBUTES: [keyof DepthEffects, string][] = [
  ['glow', 'depthGlow'],
  ['glass', 'depthGlass'],
  ['litKeys', 'depthLitKeys'],
  ['grain', 'depthGrain'],
];

const GLOW_WIDTH = 64;
const STRIP_SPREAD = 5;
const STILL_REPAINT_MS = 2000;
const SEEN_ALPHA = 8;

// The room strips on the screen, copied small and stretched tall to where they sit. The CSS blur spreads their
// light over the page. Their average colour is --look-glow, the colour the lit keys and strips glow in.
function drawStrips(context: CanvasRenderingContext2D, scale: number) {
  for (const strip of document.querySelectorAll<HTMLCanvasElement>('canvas.led-strip-room, canvas.led-strip-tile')) {
    const box = strip.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight || box.width === 0) continue;
    const spread = box.height * STRIP_SPREAD;
    context.drawImage(strip, box.left * scale, (box.top - spread / 2) * scale, box.width * scale, spread * scale);
  }
}

function paintGlow(glow: HTMLCanvasElement) {
  const context = glow.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  const scale = GLOW_WIDTH / window.innerWidth;
  glow.width = GLOW_WIDTH;
  glow.height = Math.round(window.innerHeight * scale);
  context.clearRect(0, 0, glow.width, glow.height);
  drawStrips(context, scale);
  const [red = 0, green = 0, blue = 0, alpha = 0] = averageOf(context.getImageData(0, 0, glow.width, glow.height).data);
  document.documentElement.style.setProperty('--look-glow', alpha ? `rgb(${red} ${green} ${blue})` : 'transparent');
}

function averageOf(pixels: Uint8ClampedArray) {
  const sum = [0, 0, 0, 0];
  let lit = 0;
  for (let at = 0; at < pixels.length; at += 4) {
    if ((pixels[at + 3] ?? 0) < SEEN_ALPHA) continue;
    lit++;
    for (let channel = 0; channel < 4; channel++) sum[channel] = (sum[channel] ?? 0) + (pixels[at + channel] ?? 0);
  }
  return lit ? sum.map((value) => Math.round(value / lit)) : sum;
}

// Paints the glow each frame while an effect that uses the look's colour is on; with reduced motion, every 2 s.
function useGlowPaint(isOn: boolean) {
  const glow = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!isOn) return undefined;
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let timer = 0;
    const tick = () => {
      if (glow.current) paintGlow(glow.current);
      if (isStill) timer = window.setTimeout(tick, STILL_REPAINT_MS);
      else frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      document.documentElement.style.removeProperty('--look-glow');
    };
  }, [isOn]);
  return glow;
}

/** Put once at the top of the app. Draws nothing of its own while every effect is off. */
export function DepthLight(effects: DepthEffects) {
  const { glow, glass, litKeys, grain } = effects;
  const canvas = useGlowPaint(glow || litKeys);
  useEffect(() => {
    const root = document.documentElement;
    const shown = { glow, glass, litKeys, grain };
    for (const [effect, attribute] of ATTRIBUTES) {
      if (shown[effect]) root.dataset[attribute] = '';
      else delete root.dataset[attribute];
    }
    return () => {
      for (const [, attribute] of ATTRIBUTES) delete root.dataset[attribute];
    };
  }, [glow, glass, litKeys, grain]);
  return (
    <>
      <canvas ref={canvas} className="depth-glow" aria-hidden="true" />
      <div className="depth-grain" aria-hidden="true" />
    </>
  );
}
