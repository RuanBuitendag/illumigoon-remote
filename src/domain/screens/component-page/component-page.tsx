import { ComponentEntry, ComponentPageLayout, ComponentState } from '../../../composites';
import { CONTROLS } from './control-specimens';
import { LOOK_AND_ROOM_PARTS } from './look-specimens';
import { PRIMITIVES } from './primitive-specimens';
import { SCREENS } from './screen-specimens';
import type { Specimen } from './specimen';

const INTRO =
  'Every export of the two doors, in each of its states, with made-up props. Nothing here talks to a light. ' +
  'The app has no hover look. Tab to any control to see the one focus ring, and hold a key that holds.';

const DOORS = [
  { door: 'src/design-system', specimens: PRIMITIVES },
  { door: 'src/composites', specimens: [...CONTROLS, ...LOOK_AND_ROOM_PARTS, ...SCREENS] },
];

function Entry({ door, specimen }: { door: string; specimen: Specimen }) {
  return (
    <ComponentEntry name={specimen.name} door={door}>
      {Object.entries(specimen.states).map(([state, shown]) => (
        <ComponentState key={state} state={state}>
          {shown}
        </ComponentState>
      ))}
    </ComponentEntry>
  );
}

// `?components` on the dev server (D68). scripts/lint/rules.mjs fails when a door exports a component
// that has no specimen here.
export function ComponentPage() {
  return (
    <ComponentPageLayout title="Components" intro={INTRO}>
      {DOORS.flatMap(({ door, specimens }) =>
        specimens.map((specimen) => <Entry key={specimen.name} door={door} specimen={specimen} />),
      )}
    </ComponentPageLayout>
  );
}
