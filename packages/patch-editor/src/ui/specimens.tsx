/**
 * Edit's controls for the app's component page (ST-1, D68), each in its states, with made-up props.
 * Nothing here talks to a light. Each specimen sits in `.patch-editor`, so it wears Edit's own styles.
 */

import { useState, type ReactNode } from 'react';
import { Icon } from '../../../../src/design-system';
import type { ParamSpec } from '../domain/catalog';
import { Seg } from './bits';
import { Choice, Field, IconKey, Pill, Toggle } from './controls';
import { Knob } from './Knob';

type Specimen = { name: string; states: Record<string, ReactNode> };

const nothing = () => undefined;

const InEdit = ({ children }: { children: ReactNode }) => <div className="patch-editor">{children}</div>;

const SPEED: ParamSpec = { key: 'speed', label: 'Speed', min: 0, max: 2, def: 0.5, mod: true, overflow: 'clamp', unit: 'x' };
const DRIFT = { id: 'row-1', src: 2, depth: 0.4, bipolar: true, srcBipolar: true };

/** A dial that turns, so its keys and drag can be tried here. */
function LiveKnob({ disabled, isModulated }: { disabled?: boolean; isModulated?: boolean }) {
  const [value, setValue] = useState(SPEED.def);
  return (
    <Knob
      spec={SPEED}
      value={value}
      disabled={disabled}
      mods={isModulated ? [DRIFT] : []}
      onChange={setValue}
      onPolarity={nothing}
      onUnbind={nothing}
    />
  );
}

/** A row of choices that can be picked here. */
function LiveSeg({ tight }: { tight?: boolean }) {
  const [value, setValue] = useState('line');
  return <Seg label="Emitter" items={['line', 'sparkle', 'wave']} value={value} tight={tight} onChange={setValue} />;
}

function LiveToggle({ disabled }: { disabled?: boolean }) {
  const [isOn, setIsOn] = useState(false);
  return (
    <Toggle isOn={isOn} disabled={disabled} title="Mute" onClick={() => setIsOn(!isOn)}>
      M
    </Toggle>
  );
}

const states = (shown: Record<string, ReactNode>) =>
  Object.fromEntries(Object.entries(shown).map(([state, node]) => [state, <InEdit key={state}>{node}</InEdit>]));

export const EDIT_SPECIMENS: Specimen[] = [
  {
    name: 'Pill',
    states: states({
      default: <Pill onClick={nothing}>UNDO</Pill>,
      primary: <Pill isPrimary onClick={nothing}>SAVE</Pill>,
      small: <Pill isSmall onClick={nothing}>COPY</Pill>,
      disabled: <Pill disabled>REDO</Pill>,
    }),
  },
  {
    name: 'IconKey',
    states: states({
      default: <IconKey label="Add a layer" onClick={nothing}><Icon.Plus /></IconKey>,
      small: <IconKey isSmall label="Remove" onClick={nothing}><Icon.X /></IconKey>,
      disabled: <IconKey disabled label="Add a layer"><Icon.Plus /></IconKey>,
    }),
  },
  {
    name: 'Toggle',
    states: states({
      'off, tap to turn on': <LiveToggle />,
      on: <Toggle isOn title="Solo" onClick={nothing}>S</Toggle>,
      disabled: <LiveToggle disabled />,
    }),
  },
  {
    name: 'Seg',
    states: states({ default: <LiveSeg />, tight: <LiveSeg tight /> }),
  },
  {
    name: 'Knob',
    states: states({
      'default, arrows and drag turn it': <LiveKnob />,
      modulated: <LiveKnob isModulated />,
      disabled: <LiveKnob disabled />,
    }),
  },
  {
    name: 'Field',
    states: states({
      empty: <Field label="Name this look" className="well" placeholder="Name this look" />,
      filled: <Field label="Unit" className="well" defaultValue="Hz" />,
      disabled: <Field label="Unit" className="well" defaultValue="Hz" disabled />,
    }),
  },
  {
    name: 'Choice',
    states: states({
      default: (
        <Choice label="Blend" className="blendchip" defaultValue="add">
          <option value="add">add</option>
          <option value="screen">screen</option>
        </Choice>
      ),
      disabled: (
        <Choice label="Blend" className="blendchip" defaultValue="add" disabled>
          <option value="add">add</option>
        </Choice>
      ),
    }),
  },
];
