import { PATCH_LOOKS, type PatchLook } from './looks';

export type LookGroup = { title: string; note: string; ids: string[] };

export const LOOK_GROUPS: LookGroup[] = [
  {
    title: 'Fire and warmth',
    note: 'Good for evenings',
    ids: [
      'candle',
      'coals',
      'embers',
      'dark-embers',
      'flickering-fire',
      'perlin-flame',
      'perlin-flame-2',
      'lava-lamp',
    ],
  },
  {
    title: 'Water and sky',
    note: 'Slow and calm',
    ids: [
      'ocean-swell',
      'beach-sunset',
      'sunset',
      'starfield',
      'falling-aurora',
      'downpour',
      'dusk-duotone',
      'black-hole',
    ],
  },
  { title: 'Colour and motion', note: '', ids: ['wavering-orbs', 'ricochet', 'searchlight', 'heartbeat'] },
  {
    title: 'Moves to music',
    note: 'Listens through the light',
    ids: [
      'tempo-aurora',
      'kick-comet',
      'bubbling-field',
      'audio-line',
      'audio-snail',
      'bouncing-balls',
      'echo',
      'mirror',
      'mirror-brush',
      'mirror-reveal',
      'pall-punch',
      'prism-glow',
      'prism-fan',
      'prism-pulse',
      'jizzing',
    ],
  },
];

const DESCRIPTIONS: Record<string, string> = {
  candle: 'A single flame that breathes and flickers.',
  coals: 'A burned-down fire. Hot spots slide over a dim red bed.',
  embers: 'Sparks that rise, glow and fade.',
  'dark-embers': 'Embers in a nearly dark room.',
  'flickering-fire': 'A lively open fire.',
  'perlin-flame': 'Soft flame that drifts along the strip.',
  'perlin-flame-2': 'A taller, brighter flame.',
  'lava-lamp': 'Slow blobs of colour that merge and part.',
  'ocean-swell': 'Long swells roll along the strip, with foam on the crests.',
  'beach-sunset': 'Sea, sand and sky at dusk. The sun slowly sets.',
  sunset: 'The whole strip is a sky going from gold to indigo.',
  starfield: 'Stars fade in and out, with the odd shooting star.',
  'falling-aurora': 'Green curtains of light drift down.',
  downpour: 'Rain that swells and eases, with lightning now and then.',
  'dusk-duotone': 'Two colours meet and slowly trade places.',
  'black-hole': 'Light circles a dark centre and is pulled in.',
  'wavering-orbs': 'Coloured lights wander and drift past each other.',
  ricochet: 'A bright spark bounces from end to end.',
  searchlight: 'One soft beam sweeps back and forth.',
  heartbeat: 'A slow double pulse from the middle out.',
  'tempo-aurora': 'An aurora that speeds up with fast songs and settles with slow ones.',
  'kick-comet': 'A comet shoots along the strip on every beat.',
  'bubbling-field': 'Bubbles rise and pop as the music gets louder.',
  'audio-line': 'A line that grows and glows with the music.',
  'audio-snail': 'A trail that creeps forward on each sound.',
  'bouncing-balls': 'Balls jump on the beat and fall back.',
  echo: 'Each beat sends ripples that fade away.',
  jizzing: 'Bursts of white on every hit.',
  mirror: 'Music shown from both ends of the strip at once.',
  'mirror-brush': 'Sound paints colour out from the middle.',
  'mirror-reveal': 'Loud parts uncover a hidden colour.',
  'pall-punch': 'A hard red hit on every kick drum.',
  'prism-fan': 'Rainbow bands that fan out with the music.',
  'prism-glow': 'A soft rainbow that brightens with sound.',
  'prism-pulse': 'Rainbow pulses on the beat.',
};

export const lookDescription = (id: string) => DESCRIPTIONS[id] ?? '';

const MUSIC_LOOKS = new Set(LOOK_GROUPS.find(({ title }) => title === 'Moves to music')?.ids);
export const movesToMusic = (id: string) => MUSIC_LOOKS.has(id);

const looksById = new Map(PATCH_LOOKS.map((look) => [look.id, look]));

export const groupedLooks = () =>
  LOOK_GROUPS.map((group) => ({
    ...group,
    looks: group.ids.flatMap((id) => looksById.get(id) ?? []),
  }));

type Surface = { key?: string; target?: string; lo?: number; hi?: number }[];

// A light reports the document it plays without its name. The shape of a document still says
// which look it is: what its controls reach, and how many layers and modulators it has.
function shapeOf(document: Record<string, unknown>) {
  const surface = (document.surface as Surface | undefined) ?? [];
  const controls = surface.map(({ key, target, lo, hi }) => [key, target, lo, hi].join(':'));
  const layers = (document.layers as unknown[] | undefined)?.length ?? 0;
  const modulators = (document.modulators as unknown[] | undefined)?.length ?? 0;
  return `${layers}/${modulators}/${controls.join(',')}`;
}

const looksByShape = new Map(PATCH_LOOKS.map((look) => [shapeOf(look.document), look]));

export const lookShape = ({ type, params }: { type: string; params: Record<string, unknown> }) =>
  type === 'patch' ? shapeOf(params) : type;

export const findPatchLook = (document: Record<string, unknown>): PatchLook | undefined =>
  looksByShape.get(shapeOf(document));
