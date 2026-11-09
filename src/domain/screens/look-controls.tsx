import { useRef, useState } from 'react';
import { ColourEditor, ControlGroup, ControlList, NamingRow, SheetFooter } from '../../composites';
import { BLACK_HEX, colourToHex, hexToColour, TextKey, type Colour } from '../../design-system';
import type { Parameter, ParameterValue } from '../light-network/protocol';
import { changeControl } from '../store/change-control';
import type { Light } from '../store/fleet-store';
import { keepPalette, useLibrary, type PaletteEntry } from '../store/library-store';
import { saveAsNewLook, suggestedLookName } from '../store/look-play';
import { currentControls, lookColoursName, lookNameOf } from '../store/rooms';
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

const familyOf = ({ group, shipped }: PaletteEntry) => (shipped ? (group ?? 'Colours') : 'Yours');

const toColourSet = (palette: PaletteEntry, index: number) => {
  const { file, name, entries, error, shipped } = palette;
  // A palette with no file comes out of a look. Those are dark ramps, which the lights show badly.
  if (error || (!file && !shipped)) return [];
  const colours = entries.map((entry) => `#${entry.replace('#', '')}`);
  return [{ id: file ?? `listed-${index}`, name, family: familyOf(palette), colours }];
};

const toField = (light: Light | undefined) => (parameter: Parameter) => ({
  key: parameter.key,
  label: parameter.label,
  isPalette: parameter.type === 'palette',
  colours: toHexList(parameter),
  minimumColours: parameter.min ?? 1,
  ownName: lookColoursName(light, parameter),
});

const MAX_UNDO_STEPS = 20;
// Changes to one control closer together than this are one drag, so one Undo step.
const ONE_DRAG_MS = 600;

type UndoStep = { key: string; value: ParameterValue };

// One Undo for every control of the look on these lights. A new look starts with none.
function useLookUndo(lights: Light[], lookKey: string) {
  const [steps, setSteps] = useState<{ lookKey: string; steps: UndoStep[] }>({ lookKey, steps: [] });
  const lastChange = useRef({ key: '', at: 0 });
  const current = steps.lookKey === lookKey ? steps.steps : [];
  const remember = (step: UndoStep) =>
    setSteps({ lookKey, steps: [...current.slice(1 - MAX_UNDO_STEPS), step] });
  return {
    canUndo: current.length > 0,
    remember,
    // A drag on a slider sends many values, and only the first one is a step.
    change: (key: string, value: ParameterValue, before: ParameterValue | undefined) => {
      const now = Date.now();
      const isSameDrag = lastChange.current.key === key && now - lastChange.current.at < ONE_DRAG_MS;
      lastChange.current = { key, at: now };
      if (!isSameDrag && before !== undefined) remember({ key, value: before });
      changeControl(lights, key, value);
    },
    undo: () => {
      const previous = current.at(-1);
      if (!previous) return;
      lastChange.current = { key: '', at: 0 };
      setSteps({ lookKey, steps: current.slice(0, -1) });
      changeControl(lights, previous.key, previous.value);
    },
  };
}

type LookUndo = ReturnType<typeof useLookUndo>;

function ColoursOf({ lights, parameters, undo }: { lights: Light[]; parameters: Parameter[]; undo: LookUndo }) {
  const sets = useLibrary((library) => library.palettes).flatMap(toColourSet);
  const valueOf = (key: string, colours: string[]): ParameterValue => {
    const isPalette = parameters.some((parameter) => parameter.key === key && parameter.type === 'palette');
    return isPalette ? colours.map(hexToColour) : hexToColour(colours[0] ?? BLACK_HEX);
  };
  return (
    <ColourEditor
      fields={parameters.map(toField(lights[0]))}
      sets={sets}
      canUndo={undo.canUndo}
      onStep={(key, colours) => undo.remember({ key, value: valueOf(key, colours) })}
      onUndo={undo.undo}
      onChange={(key, colours) => changeControl(lights, key, valueOf(key, colours))}
      onKeepSet={(name, colours) => void keepPalette(name, colours)}
    />
  );
}

export function LookControls({ lights }: { lights: Light[] }) {
  const [isNaming, setNaming] = useState(false);
  const light = lights[0];
  const undo = useLookUndo(lights, `${light?.address}-${lookNameOf(light)}`);
  if (!light) return null;
  const controls = currentControls(light);
  const isColour = ({ type }: Parameter) => COLOUR_TYPES.includes(type);
  const hasColours = controls.some(isColour);

  const keepLook = (name: string) => {
    void saveAsNewLook(lights, name);
    setNaming(false);
  };

  return (
    <ControlList>
      <ColoursOf
        key={`${light.address}-${lookNameOf(light)}`}
        lights={lights}
        parameters={controls.filter(isColour)}
        undo={undo}
      />
      {groupControls(controls.filter((control) => !isColour(control))).map(([group, parameters]) => (
        <ControlGroup key={group} title={group}>
          {parameters.map((parameter) => (
            <LookControl
              key={parameter.key}
              parameter={parameter}
              onChange={(value) => undo.change(parameter.key, value, parameter.default)}
            />
          ))}
        </ControlGroup>
      ))}
      {isNaming ? (
        <NamingRow
          label="Name"
          suggestion={suggestedLookName(light)}
          onCancel={() => setNaming(false)}
          onKeep={keepLook}
        />
      ) : (
        <SheetFooter>
          {/* With colours, Undo stands beside them, where most changes are made. */}
          {!hasColours && undo.canUndo && (
            <TextKey isQuiet onClick={undo.undo}>
              UNDO
            </TextKey>
          )}
          <TextKey isQuiet onClick={() => setNaming(true)}>
            SAVE AS NEW
          </TextKey>
        </SheetFooter>
      )}
    </ControlList>
  );
}
