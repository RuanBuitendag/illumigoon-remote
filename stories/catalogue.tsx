import type { ArgTypes, StoryObj } from '@storybook/react-vite';
import { EDIT_SPECIMENS } from '@illumigoon/patch-editor';
import { createElement, isValidElement, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { ComponentEntry, ComponentFocusState, ComponentNotes, ComponentState } from '../src/composites';
import { CONTROLS } from '../src/domain/screens/component-page/control-specimens';
import { LOOK_AND_ROOM_PARTS } from '../src/domain/screens/component-page/look-specimens';
import { COMPOSITE_NOTES } from '../src/domain/screens/component-page/notes-composites';
import { DESIGN_SYSTEM_NOTES, type Notes } from '../src/domain/screens/component-page/notes-design-system';
import { SCREEN_AND_EDIT_NOTES } from '../src/domain/screens/component-page/notes-screens';
import { PRIMITIVES } from '../src/domain/screens/component-page/primitive-specimens';
import { SCREENS } from '../src/domain/screens/component-page/screen-specimens';
import { OnDemand, type Specimen } from '../src/domain/screens/component-page/specimen';

// One story for each export of a door. At the top, the component from the first state that draws it straight,
// with its props in Controls: change them there to try a variant. Below, its notes and every state the app shows,
// as on the component page. The specimens and notes stay where lint:rules reads them.
const SPECIMENS: Specimen[] = [...PRIMITIVES, ...CONTROLS, ...LOOK_AND_ROOM_PARTS, ...SCREENS, ...EDIT_SPECIMENS];
const NOTES: Record<string, Notes> = { ...DESIGN_SYSTEM_NOTES, ...COMPOSITE_NOTES, ...SCREEN_AND_EDIT_NOTES };
const TERMS: [keyof Notes, string][] = [
  ['parts', 'Parts'],
  ['keys', 'Keys'],
  ['role', 'Role'],
  ['use', 'Do'],
  ['avoid', 'Don’t'],
];

type Args = Record<string, unknown>;
type Tried = { component: ComponentType<Args>; args: Args };

// The type of a prop as Storybook's docgen reads it from the source.
type DocgenType = { name: string; raw?: string; elements?: { name: string; value?: string }[] };
type Docgen = { props?: Record<string, { tsType?: DocgenType; description?: string }> };

// The first state that is the component itself, not a frame or a key that opens it.
function triedOf(specimen: Specimen): Tried | undefined {
  for (const shown of Object.values(specimen.states)) {
    if (!isValidElement(shown) || typeof shown.type === 'string' || shown.type === OnDemand) continue;
    const element = shown as ReactElement<Args>;
    return { component: element.type as ComponentType<Args>, args: { ...element.props } };
  }
  return undefined;
}

const literalsOf = (type: DocgenType) =>
  type.elements?.every(({ name }) => name === 'literal')
    ? type.elements.map(({ value = '' }) => value.replace(/^['"]|['"]$/g, ''))
    : undefined;

function controlOf(type: DocgenType | undefined): ArgTypes[string]['control'] {
  if (!type) return undefined;
  if (type.name === 'boolean') return { type: 'boolean' };
  if (type.name === 'number') return { type: 'number' };
  if (type.name === 'string') return { type: 'text' };
  const literals = type.name === 'union' ? literalsOf(type) : undefined;
  return literals ? { type: 'select', options: literals } : undefined;
}

// Every prop the component takes gets a control, also the ones the first state leaves out, such as `disabled`.
function argTypesOf(component: ComponentType<Args>): ArgTypes {
  const docgen = (component as { __docgenInfo?: Docgen }).__docgenInfo;
  const argTypes: ArgTypes = {};
  for (const [name, { tsType, description }] of Object.entries(docgen?.props ?? {})) {
    const control = controlOf(tsType);
    argTypes[name] = control ? { control, description } : { control: false, description };
    if (tsType?.name === 'signature' && tsType.raw?.includes('=>') && /^on[A-Z]/.test(name)) {
      argTypes[name] = { action: name, control: false, description };
    }
  }
  return argTypes;
}

function SpecimenEntry({ specimen, door, tried }: { specimen: Specimen; door: string; tried?: ReactNode }) {
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
      {tried && <ComponentState state="try it: change it in Controls">{tried}</ComponentState>}
      {states.map(([state, shown]) => (
        <ComponentState key={state} state={state}>
          {shown}
        </ComponentState>
      ))}
      {focused !== undefined && <ComponentFocusState>{focused}</ComponentFocusState>}
    </ComponentEntry>
  );
}

// `door` is the folder the component is exported from, shown beside its name.
export function specimenStory(name: string, door: string): StoryObj {
  const specimen = SPECIMENS.find((each) => each.name === name);
  if (!specimen) throw new Error(`${name} has no specimen in src/domain/screens/component-page`);
  const tried = triedOf(specimen);
  return {
    name,
    args: tried?.args ?? {},
    argTypes: tried ? argTypesOf(tried.component) : {},
    render: (args) => (
      <SpecimenEntry specimen={specimen} door={door} tried={tried && createElement(tried.component, args)} />
    ),
    parameters: { layout: 'padded' },
  };
}
