import { PATCH_LOOKS, type PatchLook } from './looks';

export type LookGroup = { title: string; note: string; ids: string[] };

export const LOOK_GROUPS: LookGroup[] = [
  {
    title: 'Fire and warmth',
    note: 'Good for evenings',
    ids: ['candle', 'coals', 'embers', 'ember-drift', 'perlin-flame', 'twinkle'],
  },
  {
    title: 'Water and sky',
    note: 'Slow and calm',
    ids: [
      'ocean-swell',
      'beach-sunset',
      'sunset',
      'starfield',
      'downpour',
      'dusk-duotone',
      'black-hole',
      'nebula',
      'liquid-blobs',
      'bioluminescence',
    ],
  },
  {
    title: 'Electric',
    note: 'Bright and restless',
    ids: ['crawling-lightning', 'storm-front', 'plasma-globe'],
  },
  {
    title: 'Moves to music',
    note: 'Listens through the light',
    ids: ['tempo-aurora', 'audio-snail', 'mirror-reveal', 'thunder-kick', 'beat-sparks'],
  },
];

const DESCRIPTIONS: Record<string, string> = {
  candle: 'A single flame that breathes and flickers.',
  coals: 'A burned-down fire. Hot spots slide over a dim red bed.',
  embers: 'Sparks that rise, glow and fade.',
  'ember-drift': 'Embers glow and dim under a drifting haze.',
  'perlin-flame': 'Soft flame that drifts along the strip.',
  'ocean-swell': 'Long swells roll along the strip, with foam on the crests.',
  'beach-sunset': 'Sea, sand and sky at dusk. The sun slowly sets.',
  sunset: 'The whole strip is a sky going from gold to indigo.',
  starfield: 'Stars fade in and out, with the odd shooting star.',
  downpour: 'Rain that swells and eases, with lightning now and then.',
  'dusk-duotone': 'Two colours meet and slowly trade places.',
  'black-hole': 'Light circles a dark centre and is pulled in.',
  nebula: 'Soft clouds of colour that swell and turn.',
  twinkle: 'Warm points fade in and out, each one on its own time.',
  'crawling-lightning': 'A bolt starts at one point, crawls both ways, forks and dies.',
  'liquid-blobs': 'Bright blobs merge and split in the dark.',
  bioluminescence: 'Cold sparks wake where a slow wave passes.',
  'storm-front': 'Far flashes light the sky, and close bolts crawl through them.',
  'plasma-globe': 'A hot core throws thin arcs toward both ends.',
  'thunder-kick': 'Each kick throws a bolt from a new place.',
  'beat-sparks': 'Each kick bursts sparks from a new place.',
  'tempo-aurora': 'An aurora that speeds up with fast songs and settles with slow ones.',
  'audio-snail': 'A trail that creeps forward on each sound.',
  'mirror-reveal': 'Loud parts uncover a hidden colour.',
};

export const lookDescription = (id: string) => DESCRIPTIONS[id] ?? '';

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
