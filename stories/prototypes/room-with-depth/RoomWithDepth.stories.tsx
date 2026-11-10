import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, type ReactNode } from 'react';
import { userEvent, within } from 'storybook/test';
import { App } from '../../../src/domain';
import { openScreen } from '../../screens/open-screen';
import './depth.css';

// Prototype (LIFE-2013): the real room, with four ways to give it depth from the strips' own light. Turn each on
// and off in Controls, on the phone and the laptop size. Colour still comes only from the strips.

type Args = { lookLightsThePage: boolean; glass: boolean; litKeys: boolean; grainAndFalloff: boolean };

const FLAGS: [keyof Args, string][] = [
  ['lookLightsThePage', 'depthGlow'],
  ['glass', 'depthGlass'],
  ['litKeys', 'depthLitKeys'],
  ['grainAndFalloff', 'depthGrain'],
];

const GLOW_WIDTH = 64;

// Each frame, the room strips on the screen are copied, small and stretched tall, to where they sit, so the CSS
// blur spreads their light over the page as the LEDs light a wall. The average colour lights the keys.
function paintGlow(glow: HTMLCanvasElement) {
  const context = glow.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  const scale = GLOW_WIDTH / window.innerWidth;
  glow.width = GLOW_WIDTH;
  glow.height = Math.round(window.innerHeight * scale);
  context.clearRect(0, 0, glow.width, glow.height);
  for (const strip of document.querySelectorAll<HTMLCanvasElement>('canvas.led-strip-room, canvas.led-strip-tile')) {
    const box = strip.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight || box.width === 0) continue;
    const spread = box.height * 5;
    context.drawImage(strip, box.left * scale, (box.top - spread / 2) * scale, box.width * scale, spread * scale);
  }
  const [red = 0, green = 0, blue = 0, alpha = 0] = averageOf(context.getImageData(0, 0, glow.width, glow.height).data);
  document.documentElement.style.setProperty('--look-glow', alpha ? `rgb(${red} ${green} ${blue})` : 'transparent');
}

function averageOf(pixels: Uint8ClampedArray) {
  const sum = [0, 0, 0, 0];
  let lit = 0;
  for (let at = 0; at < pixels.length; at += 4) {
    if ((pixels[at + 3] ?? 0) < 8) continue;
    lit++;
    for (let channel = 0; channel < 4; channel++) sum[channel] = (sum[channel] ?? 0) + (pixels[at + channel] ?? 0);
  }
  return lit ? sum.map((value) => Math.round(value / lit)) : sum;
}

function Depth({ args, children }: { args: Args; children: ReactNode }) {
  const glow = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    for (const [arg, flag] of FLAGS) {
      if (args[arg]) root.dataset[flag] = '';
      else delete root.dataset[flag];
    }
  }, [args]);
  useEffect(() => {
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let timer = 0;
    const tick = () => {
      if (glow.current) paintGlow(glow.current);
      if (isStill) timer = window.setTimeout(tick, 2000);
      else frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      for (const [, flag] of FLAGS) delete document.documentElement.dataset[flag];
      document.documentElement.style.removeProperty('--look-glow');
    };
  }, []);
  return (
    <>
      <canvas ref={glow} className="depth-glow" />
      {children}
      <div className="depth-grain" />
    </>
  );
}

const withDepth: Decorator = (Story, { args }) => (
  <Depth args={args as Args}>
    <Story />
  </Depth>
);

export default {
  title: 'Prototypes/Room with depth',
  component: App,
  tags: ['!autodocs'],
  decorators: [withDepth],
  args: { lookLightsThePage: true, glass: true, litKeys: true, grainAndFalloff: true },
  argTypes: {
    lookLightsThePage: { name: '1. The look lights the page', control: 'boolean' },
    glass: { name: '2. Glass sheets and bars', control: 'boolean' },
    litKeys: { name: '3. Lit keys', control: 'boolean' },
    grainAndFalloff: { name: '4. Grain and falloff', control: 'boolean' },
  },
} satisfies Meta;

type Story = StoryObj;

export const Bedroom: Story = { beforeEach: () => openScreen({ roomId: 'Bedroom' }) };

export const Lounge: Story = { beforeEach: () => openScreen({ roomId: 'Lounge' }) };

export const Rooms: Story = { beforeEach: () => openScreen({}) };

// The save scene sheet over the lit room shows the glass.
export const SheetOverTheRoom: Story = {
  name: 'Sheet over the room',
  beforeEach: () => openScreen({ roomId: 'Bedroom' }),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('button', { name: '+ SCENE' }));
  },
};
