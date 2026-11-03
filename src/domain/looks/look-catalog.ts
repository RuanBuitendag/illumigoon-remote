import { PATCH_LOOKS, type PatchLook } from './looks';

export type LookGroup = { title: string; note: string; ids: string[] };

export const LOOK_GROUPS: LookGroup[] = [
  { title: 'Fire and warmth', note: 'Good for evenings', ids: ['candle', 'dark-embers', 'perlin-flame-2'] },
  { title: 'Water and sky', note: 'Slow and calm', ids: ['beach-sunset', 'starfield', 'downpour'] },
  { title: 'Colour and motion', note: '', ids: ['wavering-orbs', 'searchlight'] },
  {
    title: 'Moves to music',
    note: 'Listens through the light',
    ids: [
      'tempo-aurora',
      'kick-comet',
      'bubbling-field',
      'audio-line',
      'bouncing-balls',
      'mirror-brush',
      'mirror-reveal',
      'pall-punch',
      'prism-fan',
    ],
  },
];

const DESCRIPTIONS: Record<string, string> = {
  candle: 'A single flame that breathes and flickers.',
  'dark-embers': 'Embers in a nearly dark room.',
  'perlin-flame-2': 'A taller, brighter flame.',
  'beach-sunset': 'Sea, sand and sky at dusk. The sun slowly sets.',
  starfield: 'Stars fade in and out, with the odd shooting star.',
  downpour: 'Rain that swells and eases, with lightning now and then.',
  'wavering-orbs': 'Coloured lights wander and drift past each other.',
  searchlight: 'One soft beam sweeps back and forth.',
  'tempo-aurora': 'An aurora that speeds up with fast songs and settles with slow ones.',
  'kick-comet': 'A comet shoots along the strip on every beat.',
  'bubbling-field': 'Bubbles rise and pop as the music gets louder.',
  'audio-line': 'A line that grows and glows with the music.',
  'bouncing-balls': 'Balls jump on the beat and fall back.',
  'mirror-brush': 'Sound paints colour out from the middle.',
  'mirror-reveal': 'Loud parts uncover a hidden colour.',
  'pall-punch': 'A hard red hit on every kick drum.',
  'prism-fan': 'Rainbow bands that fan out with the music.',
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

type Surface = { key?: string; type?: string; default?: unknown }[];

const LATER_CONTROLS = new Set(['palette', 'select']);

const countOf = (slots: unknown) => Object.keys((slots as object | undefined) ?? {}).length;

// A light reports the document it plays without its name. The shape of a document still says
// which look it is: the names of its controls, and how many layers and modulators it has. A light
// can still play a look from before it had palettes and options, so those do not count.
function shapeOf(document: Record<string, unknown>) {
  const surface = (document.surface as Surface | undefined) ?? [];
  const controls = surface.filter(({ type = '' }) => !LATER_CONTROLS.has(type));
  const keys = controls.map(({ key }) => key);
  return `${countOf(document.layers)}/${countOf(document.modulators)}/${keys.join(',')}`;
}

const looksByShape = new Map(PATCH_LOOKS.map((look) => [shapeOf(look.document), look]));

export const lookShape = ({ type, params }: { type: string; params: Record<string, unknown> }) =>
  type === 'patch' ? shapeOf(params) : type;

export const findPatchLook = (document: Record<string, unknown>): PatchLook | undefined =>
  looksByShape.get(shapeOf(document));

const surfaceOf = (document: Record<string, unknown>) => (document.surface as Surface | undefined) ?? [];
const controlId = ({ key, type }: Surface[number]) => `${key}:${type}`;

// A light keeps the document it was sent, so after an app update it can play an older copy of a look.
// This gives the new copy with the positions of the older one, or nothing when the copy is current.
export function latestDocumentOf(document: Record<string, unknown>) {
  const look = findPatchLook(document);
  if (!look) return undefined;
  const controls = surfaceOf(document);
  const isCurrent = surfaceOf(look.document).map(controlId).join() === controls.map(controlId).join();
  if (isCurrent) return undefined;
  const positions = new Map(controls.map((control) => [controlId(control), control.default]));
  const surface = surfaceOf(look.document).map((control) => {
    const position = positions.get(controlId(control));
    return position === undefined ? control : { ...control, default: position };
  });
  return { ...look.document, surface };
}
