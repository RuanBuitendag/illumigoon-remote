import { useRef, useState } from 'react';
import { BLACK_HEX, ColourFill, ColourSlot, Icon, KeyRow, Press, TextKey } from '../design-system';
import { ColourPicker } from './colour-picker';
import { HeadingRow } from './control-rows';
import { NamingRow } from './naming-row';
import { CurrentPalette, PaletteShelf, type ColourSet } from './palette-shelf';

const MAX_COLOURS = 8;

type ColourField = {
  key: string;
  label: string;
  isPalette: boolean;
  colours: string[];
  minimumColours: number;
  // What to call the colours a look came with, while they match no palette.
  ownName?: string;
};

type ColourEditorProps = {
  fields: ColourField[];
  sets: ColourSet[];
  // Undo covers every control of the look, so its steps are kept outside.
  canUndo: boolean;
  onStep: (key: string, colours: string[]) => void;
  onUndo: () => void;
  onChange: (key: string, colours: string[]) => void;
  onKeepSet: (name: string, colours: string[]) => void;
};

const replaceAt = (colours: string[], index: number, colour: string) =>
  colours.map((existing, position) => (position === index ? colour : existing));

function moved(colours: string[], index: number, shift: number) {
  const next = [...colours];
  const [colour] = next.splice(index, 1);
  if (colour) next.splice(index + shift, 0, colour);
  return next;
}

type SlotKeysProps = {
  count: number;
  canArrange: boolean;
  canRemove: boolean;
  selected: number;
  copied: string | null;
  onCopy: () => void;
  onPaste: () => void;
  onMove: (shift: number) => void;
  onRemove: () => void;
};

function SlotKeys({ count, canArrange, canRemove, selected, copied, onCopy, onPaste, onMove, onRemove }: SlotKeysProps) {
  return (
    <KeyRow>
      <TextKey onClick={onCopy}>COPY</TextKey>
      <TextKey disabled={!copied} onClick={onPaste}>
        PASTE
        {copied && <ColourFill className="paste-chip" paint={copied} />}
      </TextKey>
      {canArrange && (
        <>
          <TextKey label="Move left" disabled={selected === 0} onClick={() => onMove(-1)}>
            <Icon.Back c="currentColor" />
          </TextKey>
          <TextKey label="Move right" disabled={selected === count - 1} onClick={() => onMove(1)}>
            <Icon.Fwd c="currentColor" />
          </TextKey>
          <TextKey disabled={!canRemove} onClick={onRemove}>
            REMOVE
          </TextKey>
        </>
      )}
    </KeyRow>
  );
}

type SlotsProps = {
  field: ColourField;
  // Which slot is open, when it is in this field.
  selected: number | null;
  onSelect: (index: number) => void;
  onAdd: () => void;
};

function Slots({ field, selected, onSelect, onAdd }: SlotsProps) {
  const { label, isPalette, colours } = field;
  return (
    <div className="slots">
      {colours.map((colour, index) => (
        <ColourSlot
          key={index}
          colour={colour}
          label={`${label} ${index + 1}`}
          isSelected={index === selected}
          onClick={() => onSelect(index)}
        />
      ))}
      {isPalette && colours.length < MAX_COLOURS && (
        <Press className="slot-add" label={`Add to ${label}`} onClick={onAdd}>
          +
        </Press>
      )}
    </div>
  );
}

function useColourEdits(start: ColourField, { fields, onStep, onChange }: ColourEditorProps) {
  const [picked, setPicked] = useState({ key: start.key, index: 0 });
  const [isOpen, setOpen] = useState(false);
  const hasDragged = useRef(false);
  const field = fields.find(({ key }) => key === picked.key) ?? start;
  const { key, colours } = field;
  const selected = Math.min(picked.index, colours.length - 1);

  const remember = (step: { key: string; colours: string[] }) => onStep(step.key, step.colours);

  const change = (next: string[]) => {
    remember({ key, colours });
    onChange(key, next);
  };

  return {
    field,
    selected,
    current: colours[selected] ?? BLACK_HEX,
    isOpen,
    // A tap on the open colour closes the picker.
    pick: (next: { key: string; index: number }) => {
      setOpen(!(isOpen && next.key === key && next.index === selected));
      setPicked(next);
    },
    change,
    // One press on the picker is one Undo step, however far it drags.
    closePicker: () => setOpen(false),
    grab: () => {
      hasDragged.current = false;
    },
    drag: (colour: string) => {
      if (!hasDragged.current) remember({ key, colours });
      hasDragged.current = true;
      onChange(key, replaceAt(colours, selected, colour));
    },
    applySet: (target: ColourField, set: string[]) => {
      remember({ key: target.key, colours: target.colours });
      onChange(target.key, set);
      setPicked({ key: target.key, index: 0 });
      setOpen(false);
    },
    move: (shift: number) => {
      change(moved(colours, selected, shift));
      setPicked({ key, index: selected + shift });
    },
    remove: () => {
      change(colours.filter((_, index) => index !== selected));
      setPicked({ key, index: Math.max(0, selected - 1) });
    },
    addTo: (added: ColourField) => {
      const last = added.colours.at(-1) ?? BLACK_HEX;
      remember({ key: added.key, colours: added.colours });
      onChange(added.key, [...added.colours, last]);
      setPicked({ key: added.key, index: added.colours.length });
      setOpen(true);
    },
  };
}

type ColourDetailsProps = {
  field: ColourField;
  edits: ReturnType<typeof useColourEdits>;
  isPicking: boolean;
  copied: string | null;
  onCopy: (colour: string) => void;
};

// Single colours, the last step down from a palette.
function ColourDetails({ field, edits, isPicking, copied, onCopy }: ColourDetailsProps) {
  const { selected, current, pick, change, grab, drag, move, remove, addTo } = edits;
  const { key, isPalette, colours, minimumColours } = field;
  const isHere = isPicking && edits.field.key === key;
  return (
    <>
      <Slots
        field={field}
        selected={isHere ? selected : null}
        onSelect={(index) => pick({ key, index })}
        onAdd={() => addTo(field)}
      />
      {isHere && (
        <>
          <ColourPicker colour={current} onGrab={grab} onChange={drag} />
          <SlotKeys
            count={colours.length}
            canArrange={isPalette}
            canRemove={colours.length > minimumColours}
            selected={selected}
            copied={copied}
            onCopy={() => onCopy(current)}
            onPaste={() => copied && change(replaceAt(colours, selected, copied))}
            onMove={move}
            onRemove={remove}
          />
        </>
      )}
    </>
  );
}

type PaletteChoicesProps = {
  field: ColourField;
  sets: ColourSet[];
  onApply: (colours: string[]) => void;
  onKeep: (name: string) => void;
  onChangeColours: () => void;
};

function PaletteChoices({ field, sets, onApply, onKeep, onChangeColours }: PaletteChoicesProps) {
  const [isNaming, setNaming] = useState(false);
  const { colours, minimumColours } = field;
  const keep = (name: string) => {
    onKeep(name);
    setNaming(false);
  };
  return (
    <>
      {isNaming ? (
        <NamingRow label="Name of the colours" onCancel={() => setNaming(false)} onKeep={keep} />
      ) : (
        <HeadingRow
          heading={
            <TextKey onClick={onChangeColours}>
              CHANGE COLOURS
              <Icon.Fwd c="currentColor" />
            </TextKey>
          }
        >
          <TextKey isQuiet onClick={() => setNaming(true)}>
            SAVE THESE
          </TextKey>
        </HeadingRow>
      )}
      <PaletteShelf
        sets={sets}
        current={colours}
        maxColours={MAX_COLOURS}
        minimumColours={minimumColours}
        onApply={onApply}
      />
    </>
  );
}

function OpenColourEditor({ first, ...props }: ColourEditorProps & { first: ColourField }) {
  const { fields, sets, canUndo, onUndo, onKeepSet } = props;
  const edits = useColourEdits(fields.find(({ isPalette }) => isPalette) ?? first, props);
  const { isOpen, applySet, closePicker } = edits;
  const [copied, setCopied] = useState<string | null>(null);
  // Closed, then the palettes to choose from, then the single colours of this one.
  const [opened, setOpened] = useState<{ key: string; step: 'palettes' | 'colours' } | null>(null);
  const isPicking = isOpen || !fields.some(({ isPalette }) => isPalette);

  const goTo = (next: typeof opened) => {
    setOpened(next);
    closePicker();
  };

  const details = (field: ColourField) => (
    <ColourDetails field={field} edits={edits} isPicking={isPicking} copied={copied} onCopy={setCopied} />
  );

  const paletteSteps = (field: ColourField) => {
    const { key, label, colours } = field;
    const step = opened?.key === key ? opened.step : null;
    return (
      <>
        <CurrentPalette
          label={label}
          colours={colours}
          ownName={field.ownName}
          sets={sets}
          maxColours={MAX_COLOURS}
          isOpen={step !== null}
          onClick={() => goTo(step ? null : { key, step: 'palettes' })}
        />
        {step === 'palettes' && (
          <PaletteChoices
            field={field}
            sets={sets}
            onApply={(set) => {
              applySet(field, set);
              setOpened(null);
            }}
            onKeep={(name) => onKeepSet(name, colours)}
            onChangeColours={() => goTo({ key, step: 'colours' })}
          />
        )}
        {step === 'colours' && (
          <>
            <TextKey onClick={() => goTo({ key, step: 'palettes' })}>
              <Icon.Back c="currentColor" />
              OTHER COLOURS
            </TextKey>
            {details(field)}
          </>
        )}
      </>
    );
  };

  return (
    <div className="colour-editor">
      {fields.map((field) => (
        <div key={field.key} className="colour-field">
          <span className="control-label">
            {field.label}
            {field === first && canUndo && (
              <TextKey isQuiet onClick={onUndo}>
                UNDO
              </TextKey>
            )}
          </span>
          {field.isPalette ? paletteSteps(field) : details(field)}
        </div>
      ))}
    </div>
  );
}

export function ColourEditor(props: ColourEditorProps) {
  const first = props.fields[0];
  return first ? <OpenColourEditor first={first} {...props} /> : null;
}
