import type { ArgTypes, StoryObj } from '@storybook/react-vite';
import { EDIT_SPECIMENS } from '@illumigoon/patch-editor';
import { createElement, isValidElement, type ComponentType, type ReactElement } from 'react';
import { ComponentFocusState } from '../../src/composites';
import { CONTROLS } from '../../src/domain/screens/component-page/control-specimens';
import { LOOK_AND_ROOM_PARTS } from '../../src/domain/screens/component-page/look-specimens';
import { COMPOSITE_NOTES } from '../../src/domain/screens/component-page/notes-composites';
import { DESIGN_SYSTEM_NOTES, type Notes } from '../../src/domain/screens/component-page/notes-design-system';
import { SCREEN_AND_EDIT_NOTES } from '../../src/domain/screens/component-page/notes-screens';
import { PRIMITIVES } from '../../src/domain/screens/component-page/primitive-specimens';
import { SCREENS } from '../../src/domain/screens/component-page/screen-specimens';
import { OnDemand, type Specimen } from '../../src/domain/screens/component-page/specimen';

// What the written story files use (LIFE-2009). Each export of a door is one entry in the sidebar: a Playground
// with its props in Controls, then one story for each state the app shows, and its notes on the Docs page. The
// specimens and notes stay where lint:rules reads them; `npm run stories` writes the files from them.
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

function specimenOf(name: string): Specimen {
  const specimen = SPECIMENS.find((each) => each.name === name);
  if (!specimen) throw new Error(`${name} has no specimen in src/domain/screens/component-page`);
  return specimen;
}

// The notes as the Docs page's description, and where the component comes from.
export function componentParameters(name: string, door: string) {
  const notes = NOTES[name];
  const lines = TERMS.filter(([key]) => notes?.[key]).map(([key, term]) => `**${term}.** ${notes?.[key]}`);
  return {
    layout: 'padded',
    docs: { description: { component: [`From \`${door}\`.`, ...lines].join('\n\n') } },
  };
}

export function stateStory(name: string, state: string): StoryObj {
  const shown = specimenOf(name).states[state];
  return { render: () => <>{shown}</> };
}

// The first state that draws the component straight, with every prop in Controls.
export function playground(name: string): StoryObj {
  const tried = triedOf(specimenOf(name));
  if (!tried) throw new Error(`${name} has no state that draws it straight`);
  return {
    args: tried.args,
    argTypes: argTypesOf(tried.component),
    render: (args) => createElement(tried.component, args),
  };
}

// The state the specimen names in `focus`, the first one when it names none, drawn with the focus ring.
export function focusStory(name: string): StoryObj {
  const specimen = specimenOf(name);
  const focusName = specimen.focus ?? Object.keys(specimen.states)[0] ?? '';
  return { render: () => <ComponentFocusState>{specimen.states[focusName]}</ComponentFocusState> };
}
