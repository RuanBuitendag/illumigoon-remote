import { useState } from 'react';
import {
  ColourEditor,
  ControlGroup,
  NamingRow,
  SelectRow,
  Sheet,
  SheetNote,
  SliderRow,
} from '../../composites';
import { BLACK_HEX, colourToHex, hexToColour, TextKey, type Colour } from '../../design-system';
import type { Parameter, ParameterValue } from '../light-network/protocol';
import { setParameter, setTransition, type Light } from '../store/fleet-store';
import { addColourSet, addSavedLook, useHousehold } from '../store/household-store';
import { setSheetOpen } from '../store/navigation-store';
import { currentControls, lookNameOf } from '../store/rooms';
import { LookControl } from './look-control';

const MAX_TRANSITION_SECONDS = 10;

function groupControls(controls: Parameter[]) {
  const groups = new Map<string, Parameter[]>();
  for (const control of controls) {
    const group = control.group ?? '';
    groups.set(group, [...(groups.get(group) ?? []), control]);
  }
  return [...groups];
}

function TransitionControls({ lights, light }: { lights: Light[]; light: Light }) {
  if (light.transitions.length === 0) return null;
  const id = light.transitionId ?? light.transitions[0]?.id ?? '';
  const seconds = (light.transitionMs ?? 0) / 1000;
  return (
    <ControlGroup title="Changing to the next look">
      <SelectRow
        label="Style"
        options={light.transitions.map(({ id: value, name }) => ({ value, name }))}
        value={id}
        onChange={(next) => setTransition(lights, next, seconds * 1000)}
      />
      <SliderRow
        label="How long it takes"
        valueText={`${seconds.toFixed(1)} s`}
        value={seconds}
        min={0}
        max={MAX_TRANSITION_SECONDS}
        step={0.1}
        onChange={(next) => setTransition(lights, id, next * 1000)}
      />
    </ControlGroup>
  );
}

const toHexList = ({ default: value }: Parameter) =>
  (Array.isArray(value) ? value : [value as Colour]).map(colourToHex);

function ColoursOf({ lights, parameter, onClose }: { lights: Light[]; parameter: Parameter; onClose: () => void }) {
  const sets = useHousehold((household) => household.colourSets);
  const isPalette = parameter.type === 'palette';
  const toValue = (colours: string[]): ParameterValue =>
    isPalette ? colours.map(hexToColour) : hexToColour(colours[0] ?? BLACK_HEX);
  return (
    <ColourEditor
      isPalette={isPalette}
      colours={toHexList(parameter)}
      sets={sets}
      onChange={(colours) => setParameter(lights, parameter.key, toValue(colours))}
      onKeepSet={addColourSet}
      onClose={onClose}
    />
  );
}

export function ControlsSheet({ lights }: { lights: Light[] }) {
  const [isNaming, setNaming] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const light = lights[0];
  if (!light) return null;
  const controls = currentControls(light);
  const editing = controls.find(({ key }) => key === editingKey);
  if (editing) return <ColoursOf lights={lights} parameter={editing} onClose={() => setEditingKey(null)} />;

  const keepLook = (name: string) => {
    if (light.animation) addSavedLook({ name, baseName: lookNameOf(light) ?? '', animation: light.animation });
    setNaming(false);
  };

  const actions = (
    <>
      <TextKey isQuiet onClick={() => setNaming(true)}>
        SAVE AS
      </TextKey>
      <TextKey onClick={() => setSheetOpen(false)}>DONE</TextKey>
    </>
  );

  return (
    <Sheet label="Adjust the look" title={lookNameOf(light)} actions={actions}>
      {isNaming && <NamingRow label="Name of the look" onCancel={() => setNaming(false)} onKeep={keepLook} />}
      {controls.length === 0 && <SheetNote>This look has nothing to adjust.</SheetNote>}
      {groupControls(controls).map(([group, parameters]) => (
        <ControlGroup key={group} title={group}>
          {parameters.map((parameter) => (
            <LookControl
              key={parameter.key}
              parameter={parameter}
              onChange={(value) => setParameter(lights, parameter.key, value)}
              onEditColours={() => setEditingKey(parameter.key)}
            />
          ))}
        </ControlGroup>
      ))}
      <TransitionControls lights={lights} light={light} />
    </Sheet>
  );
}
