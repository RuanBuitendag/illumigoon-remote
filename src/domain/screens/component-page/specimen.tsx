import { useState, type ReactNode } from 'react';
import { ComponentFrame } from '../../../composites';
import { LED_COUNT, STARTER_COLOUR_SETS, TextKey, type StripRecording } from '../../../design-system';

// One export of a door on the component page (D68), and what it looks like in each of its states. `focus` names
// the state drawn again with the focus ring (ST-1): the first state when left out, none when null, as for a
// screen, a sheet that takes the focus itself, or a part with no control.
export type Specimen = { name: string; states: Record<string, ReactNode>; focus?: string | null };

export const nothing = () => undefined;

export const LONG_NAME = 'A very long name that goes on past the width of a phone, so it has to wrap or be cut';

export const SUNSET = STARTER_COLOUR_SETS[0]?.colours ?? [];

const FRAMES = 30;

// A made-up look for the LED strips: a slow wave of warm light along the tape, drawn here, never from a light.
function madeUpRecording(): StripRecording {
  const frames = new Uint8Array(FRAMES * LED_COUNT * 3);
  for (let frame = 0; frame < FRAMES; frame++) {
    for (let led = 0; led < LED_COUNT; led++) {
      const wave = (Math.sin((led / LED_COUNT + frame / FRAMES) * Math.PI * 2) + 1) / 2;
      const at = (frame * LED_COUNT + led) * 3;
      frames[at] = Math.round(80 + 175 * wave);
      frames[at + 1] = Math.round(30 + 90 * wave);
      frames[at + 2] = Math.round(60 * (1 - wave));
    }
  }
  return { frames, frameCount: FRAMES };
}

export const RECORDING = madeUpRecording();

type OnDemandProps = { label: string; children: (close: () => void) => ReactNode };

// A sheet or dialog takes the focus and makes the rest of the page inert, so it opens only when asked,
// in a frame of its own. Escape, the scrim or its own way out close it again.
export function OnDemand({ label, children }: OnDemandProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <TextKey onClick={() => setIsOpen(true)}>{label}</TextKey>
      {isOpen && <ComponentFrame size="screen">{children(() => setIsOpen(false))}</ComponentFrame>}
    </>
  );
}
