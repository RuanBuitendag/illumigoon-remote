// `npm run stories` writes one Storybook file for each component, from its specimen (LIFE-2009). The sidebar then
// follows the layers: Design system, Composites and their groups, then the component, then one story per state.
// `npm run lint:stories` runs the same with `--check` and fails when a written file is out of date.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

// The specimens build React elements and never draw them, but some modules they load touch browser objects.
class Stub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver ??= Stub;
globalThis.ResizeObserver ??= Stub;
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const SPECIMEN_DIR = '/src/domain/screens/component-page';
const SOURCES = [
  { file: `${SPECIMEN_DIR}/primitive-specimens.tsx`, list: 'PRIMITIVES', door: 'src/design-system' },
  { file: `${SPECIMEN_DIR}/control-specimens.tsx`, list: 'CONTROLS', door: 'src/composites' },
  { file: `${SPECIMEN_DIR}/look-specimens.tsx`, list: 'LOOK_AND_ROOM_PARTS', door: 'src/composites' },
  { file: `${SPECIMEN_DIR}/screen-specimens.tsx`, list: 'SCREENS', door: 'src/composites' },
  { file: '/packages/patch-editor/src/ui/specimens.tsx', list: 'EDIT_SPECIMENS', door: 'packages/patch-editor' },
];

// The group of each component in the sidebar. A component with no group fails, so a new one gets a place.
const GROUPS = {
  'Design system/Keys': [
    'Press', 'TextKey', 'ActionKey', 'LinkKey', 'AddKey', 'FileKey', 'BackKey', 'KeyRow', 'ArmedKey', 'KeyGroup',
    'PowerKey', 'SettingSwitch',
  ],
  'Design system/Inputs': [
    'OptionRow', 'Fader', 'FaderBand', 'FaderDot', 'TextField', 'TextArea', 'Swatch', 'ColourSlot', 'ColourPad',
    'ColourFill',
  ],
  'Design system/Light and icons': ['LedStrip', 'DepthLight', 'Icon', 'IconFrame', 'SoundMark', 'Activity'],
  'Design system/Text': ['Eyebrow', 'Picked', 'ValueText'],
  'Design system/Overlays': ['Dialog'],
  'Composites/Controls': [
    'SliderRow', 'StepperRow', 'SelectRow', 'NamedSelectRow', 'ToggleRow', 'HeadingRow', 'LevelRow', 'NamingRow',
    'ChoiceList', 'ControlList', 'ControlGroup', 'InfoRow', 'DayPicker', 'LockStatus', 'PageHint', 'EmptyState',
    'ScanNote', 'ArrangeRow', 'LightDragList', 'ColourEditor',
  ],
  'Composites/Looks': [
    'LookItem', 'LookList', 'LookGroup', 'LookPreset', 'LookElsewhere', 'LookProblem', 'LookSearch',
    'FavouriteLookItem', 'FavouriteSceneItem', 'FavouriteLooks', 'WhichLine', 'LookHeading',
  ],
  'Composites/Rooms and scenes': [
    'RoomCard', 'RoomDragList', 'QuietNote', 'LockNote', 'LightCard', 'RoomSection', 'MoreRow', 'SceneLine',
    'SceneCard', 'StateCard', 'StateList', 'SceneShelf',
  ],
  'Composites/Layouts': [
    'HomeLayout', 'HouseNote', 'BottomNotice', 'ScreenStack', 'PlaceFrame', 'PlaceBar', 'PlaceView', 'JumpSheet',
    'PageFrame', 'PageSection', 'RoomLayout', 'EditLayout', 'SearchLayout',
  ],
  'Composites/Sheets and toasts': [
    'Toast', 'Presence', 'Sheet', 'SheetBody', 'SheetFooter', 'Overlay', 'OverlayBlock', 'OverlayText', 'WhichLights',
  ],
  'Composites/Component page': [
    'ComponentPageLayout', 'ComponentEntry', 'ComponentState', 'ComponentFrame', 'PaintSample', 'ComponentNotes',
    'ComponentFocusState',
  ],
  'Composites/Edit controls': ['Pill', 'IconKey', 'Toggle', 'Seg', 'Knob', 'Field', 'Choice'],
};

const groupOf = (name) => Object.keys(GROUPS).find((group) => GROUPS[group].includes(name));
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const exportName = (state) =>
  state
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');

// The first state that is the component itself, not a frame or a key that opens it, is the Playground.
function hasPlayground(specimen) {
  return Object.values(specimen.states).some(
    (shown) => shown && typeof shown === 'object' && typeof shown.type === 'function' && shown.type.name !== 'OnDemand',
  );
}

function storyFile(specimen, door, group) {
  const lines = [
    `// Written by \`npm run stories\` from the specimen of ${specimen.name}. Change the specimen, not this file.`,
    "import type { Meta } from '@storybook/react-vite';",
  ];
  const helpers = ['componentParameters', 'stateStory'];
  if (hasPlayground(specimen)) helpers.push('playground');
  const hasFocus = specimen.focus !== null;
  if (hasFocus) helpers.push('focusStory');
  lines.push(`import { ${helpers.sort().join(', ')} } from '../../support/catalogue';`, '');
  lines.push(
    'export default {',
    `  title: '${group}/${specimen.name}',`,
    `  parameters: componentParameters('${specimen.name}', '${door}'),`,
    '} satisfies Meta;',
    '',
  );
  if (hasPlayground(specimen)) lines.push(`export const Playground = playground('${specimen.name}');`);
  const taken = new Set(['Playground', 'FocusRing']);
  for (const state of Object.keys(specimen.states)) {
    let name = exportName(state);
    while (taken.has(name)) name = `${name}State`;
    taken.add(name);
    lines.push(`export const ${name} = stateStory('${specimen.name}', '${state.replace(/'/g, "\\'")}');`);
  }
  if (hasFocus) lines.push(`export const FocusRing = focusStory('${specimen.name}');`);
  return `${lines.join('\n')}\n`;
}

const isCheck = process.argv.includes('--check');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const written = new Map();
const problems = [];
try {
  for (const { file, list, door } of SOURCES) {
    const specimens = (await server.ssrLoadModule(file))[list];
    for (const specimen of specimens) {
      const group = groupOf(specimen.name);
      if (!group) {
        problems.push(`${specimen.name}: give it a group in GROUPS of scripts/stories/write-component-stories.mjs`);
        continue;
      }
      const [layer, ...rest] = group.split('/');
      const target = path.join('stories', slug(layer), slug(rest.join('-')), `${specimen.name}.stories.tsx`);
      written.set(target, storyFile(specimen, door, group));
    }
  }
} finally {
  await server.close();
}

// Files written before for a component that is gone are deleted, so the sidebar has no dead entry.
const ROOTS = ['stories/design-system', 'stories/composites'];
const existing = ROOTS.flatMap((root) =>
  fs.existsSync(root)
    ? fs.readdirSync(root, { recursive: true }).map((file) => path.join(root, file)).filter((file) => file.endsWith('.stories.tsx'))
    : [],
).filter((file) => fs.readFileSync(file, 'utf8').startsWith('// Written by `npm run stories`'));

for (const [target, text] of written) {
  // Git may check the files out with CRLF line ends on Windows; those are the same file.
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
  if (current === text) continue;
  if (isCheck) problems.push(`${target} is out of date: run npm run stories`);
  else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
}
for (const file of existing.filter((file) => !written.has(file))) {
  if (isCheck) problems.push(`${file} has no specimen any more: run npm run stories`);
  else fs.rmSync(file);
}

for (const problem of problems) console.error(problem);
console.log(problems.length ? `\n${problems.length} problems` : `stories: ${written.size} components, up to date`);
process.exit(problems.length ? 1 : 0);
