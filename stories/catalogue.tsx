import type { StoryObj } from '@storybook/react-vite';
import { EDIT_SPECIMENS } from '@illumigoon/patch-editor';
import { ComponentEntry, ComponentFocusState, ComponentNotes, ComponentState } from '../src/composites';
import { CONTROLS } from '../src/domain/screens/component-page/control-specimens';
import { LOOK_AND_ROOM_PARTS } from '../src/domain/screens/component-page/look-specimens';
import { COMPOSITE_NOTES } from '../src/domain/screens/component-page/notes-composites';
import { DESIGN_SYSTEM_NOTES, type Notes } from '../src/domain/screens/component-page/notes-design-system';
import { SCREEN_AND_EDIT_NOTES } from '../src/domain/screens/component-page/notes-screens';
import { PRIMITIVES } from '../src/domain/screens/component-page/primitive-specimens';
import { SCREENS } from '../src/domain/screens/component-page/screen-specimens';
import type { Specimen } from '../src/domain/screens/component-page/specimen';

// One story for each export of a door: its specimen from the component page, every state it has, the focus
// state, and its notes. The specimens and notes stay where lint:rules reads them, so the two show the same thing.
const SPECIMENS: Specimen[] = [...PRIMITIVES, ...CONTROLS, ...LOOK_AND_ROOM_PARTS, ...SCREENS, ...EDIT_SPECIMENS];
const NOTES: Record<string, Notes> = { ...DESIGN_SYSTEM_NOTES, ...COMPOSITE_NOTES, ...SCREEN_AND_EDIT_NOTES };
const TERMS: [keyof Notes, string][] = [
  ['parts', 'Parts'],
  ['keys', 'Keys'],
  ['role', 'Role'],
  ['use', 'Do'],
  ['avoid', 'Don’t'],
];

function notesText(name: string) {
  const notes = NOTES[name];
  return notes ? TERMS.map(([key, term]) => `**${term}.** ${notes[key]}`).join('\n\n') : undefined;
}

function SpecimenEntry({ specimen, door }: { specimen: Specimen; door: string }) {
  const states = Object.entries(specimen.states);
  const focusName = specimen.focus === undefined ? states[0]?.[0] : specimen.focus;
  const focused = focusName === null ? undefined : specimen.states[focusName ?? ''];
  const notes = NOTES[specimen.name];
  return (
    <ComponentEntry
      name={specimen.name}
      door={door}
      notes={notes ? <ComponentNotes notes={TERMS.map(([key, term]) => ({ term, text: notes[key] }))} /> : null}
    >
      {states.map(([state, shown]) => (
        <ComponentState key={state} state={state}>
          {shown}
        </ComponentState>
      ))}
      {focused !== undefined && <ComponentFocusState>{focused}</ComponentFocusState>}
    </ComponentEntry>
  );
}

// `door` is the folder the component is exported from, shown over its states.
export function specimenStory(name: string, door: string): StoryObj {
  const specimen = SPECIMENS.find((each) => each.name === name);
  if (!specimen) throw new Error(`${name} has no specimen in src/domain/screens/component-page`);
  return {
    name,
    render: () => <SpecimenEntry specimen={specimen} door={door} />,
    parameters: { layout: 'padded', docs: { description: { story: notesText(name) } } },
  };
}
