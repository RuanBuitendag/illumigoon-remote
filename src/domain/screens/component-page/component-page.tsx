import { EDIT_SPECIMENS } from '@illumigoon/patch-editor';
import { ComponentEntry, ComponentFocusState, ComponentNotes, ComponentPageLayout, ComponentState } from '../../../composites';
import { CONTROLS } from './control-specimens';
import { LOOK_AND_ROOM_PARTS } from './look-specimens';
import { COMPOSITE_NOTES } from './notes-composites';
import { DESIGN_SYSTEM_NOTES, type Notes } from './notes-design-system';
import { SCREEN_AND_EDIT_NOTES } from './notes-screens';
import { PRIMITIVES } from './primitive-specimens';
import { SCREENS } from './screen-specimens';
import type { Specimen } from './specimen';

const INTRO =
  'Every export of the two doors and of Edit, in each of its states, with made-up props. ' +
  'Nothing here talks to a light. ' +
  'The app has no hover look: it is used by touch. The focus state shows the one focus ring.';

const DOORS = [
  { door: 'src/design-system', specimens: PRIMITIVES },
  { door: 'src/composites', specimens: [...CONTROLS, ...LOOK_AND_ROOM_PARTS, ...SCREENS] },
  // Edit's own controls, drawn by the editor package in its own styles (ST-1).
  { door: 'packages/patch-editor', specimens: EDIT_SPECIMENS },
];

const NOTES: Record<string, Notes> = { ...DESIGN_SYSTEM_NOTES, ...COMPOSITE_NOTES, ...SCREEN_AND_EDIT_NOTES };

const TERMS: Record<keyof Notes, string> = { parts: 'Parts', keys: 'Keys', role: 'Role', use: 'Do', avoid: 'Don’t' };

const notesOf = (name: string) => {
  const notes = NOTES[name];
  if (!notes) return null;
  const terms = Object.entries(TERMS) as [keyof Notes, string][];
  return <ComponentNotes notes={terms.map(([key, term]) => ({ term, text: notes[key] }))} />;
};

function Entry({ door, specimen }: { door: string; specimen: Specimen }) {
  const states = Object.entries(specimen.states);
  const focusName = specimen.focus === undefined ? states[0]?.[0] : specimen.focus;
  const focused = focusName === null ? undefined : specimen.states[focusName ?? ''];
  return (
    <ComponentEntry name={specimen.name} door={door} notes={notesOf(specimen.name)}>
      {states.map(([state, shown]) => (
        <ComponentState key={state} state={state}>
          {shown}
        </ComponentState>
      ))}
      {focused !== undefined && <ComponentFocusState>{focused}</ComponentFocusState>}
    </ComponentEntry>
  );
}

// `?components` on the dev server (D68). scripts/lint/rules.mjs fails when a door exports a component
// that has no specimen or no notes here.
export function ComponentPage() {
  return (
    <ComponentPageLayout title="Components" intro={INTRO}>
      {DOORS.flatMap(({ door, specimens }) =>
        specimens.map((specimen) => <Entry key={specimen.name} door={door} specimen={specimen} />),
      )}
    </ComponentPageLayout>
  );
}
