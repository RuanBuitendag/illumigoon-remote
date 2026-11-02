import { useState } from 'react';
import { ColourEditor, ControlGroup, ControlList, NamingRow, SheetFooter } from '../../composites';
import { BLACK_HEX, colourToHex, hexToColour, TextKey, type Colour } from '../../design-system';
import type { Parameter, ParameterValue } from '../light-network/protocol';
import { changeControl } from '../store/change-control';
import type { Light } from '../store/fleet-store';
import { saveLook } from '../store/look-files';
import { keepPalette, useLibrary, type PaletteEntry } from '../store/library-store';
import { currentControls, lookNameOf, OWN_LOOK } from '../store/rooms';
import { LookControl } from './look-control';

const COLOUR_TYPES = ['palette', 'color_picker'];

function groupControls(controls: Parameter[]) {
  const groups = new Map<string, Parameter[]>();
  for (const control of controls) {
    const group = control.group ?? '';
    groups.set(group, [...(groups.get(group) ?? []), control]);
  }
  return [...groups];
}

const toHexList = ({ default: value }: Parameter) =>
  (Array.isArray(value) ? value : [value as Colour]).map(colourToHex);

const familyOf = ({ group, shipped }: PaletteEntry) => (shipped ? (group ?? 'Palettes') : 'Yours');

const toColourSet = (palette: PaletteEntry, index: number) => {
  const { file, name, entries, error, shipped } = palette;
  // A palette with no file comes out of a look. Those are dark ramps, which the lights show badly.
  if (error || (!file && !shipped)) return [];
  const colours = entries.map((entry) => `#${entry.replace('#', '')}`);
  return [{ id: file ?? `listed-${index}`, name, family: familyOf(palette), colours }];
};

const toField = (parameter: Parameter) => ({
  key: parameter.key,
  label: parameter.label,
  isPalette: parameter.type === 'palette',
  colours: toHexList(parameter),
  minimumColours: parameter.min ?? 1,
});

function ColoursOf({ lights, parameters }: { lights: Light[]; parameters: Parameter[] }) {
  const sets = useLibrary((library) => library.palettes).flatMap(toColourSet);
  const change = (key: string, colours: string[]) => {
    const isPalette = parameters.some((parameter) => parameter.key === key && parameter.type === 'palette');
    const value: ParameterValue = isPalette ? colours.map(hexToColour) : hexToColour(colours[0] ?? BLACK_HEX);
    changeControl(lights, key, value);
  };
  return (
    <ColourEditor
      fields={parameters.map(toField)}
      sets={sets}
      onChange={change}
      onKeepSet={(name, colours) => void keepPalette(name, colours)}
    />
  );
}

export function LookControls({ lights }: { lights: Light[] }) {
  const [isNaming, setNaming] = useState(false);
  const light = lights[0];
  if (!light) return null;
  const controls = currentControls(light);
  const isColour = ({ type }: Parameter) => COLOUR_TYPES.includes(type);

  const keepLook = (name: string) => {
    const baseName = lookNameOf(light);
    const notes = baseName && baseName !== OWN_LOOK ? `Your version of ${baseName}.` : '';
    if (light.animation) void saveLook(name, light.animation, notes);
    setNaming(false);
  };

  return (
    <ControlList>
      <ColoursOf key={`${light.address}-${lookNameOf(light)}`} lights={lights} parameters={controls.filter(isColour)} />
      {groupControls(controls.filter((control) => !isColour(control))).map(([group, parameters]) => (
        <ControlGroup key={group} title={group}>
          {parameters.map((parameter) => (
            <LookControl
              key={parameter.key}
              parameter={parameter}
              onChange={(value) => changeControl(lights, parameter.key, value)}
            />
          ))}
        </ControlGroup>
      ))}
      {isNaming ? (
        <NamingRow label="Name" onCancel={() => setNaming(false)} onKeep={keepLook} />
      ) : (
        <SheetFooter>
          <TextKey isQuiet onClick={() => setNaming(true)}>
            SAVE AS NEW
          </TextKey>
        </SheetFooter>
      )}
    </ControlList>
  );
}
