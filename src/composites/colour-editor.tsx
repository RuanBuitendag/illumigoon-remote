import { useState, type ReactNode } from 'react';
import {
  BLACK_HEX,
  ChevronMark,
  ColourFill,
  ColourSlot,
  Eyebrow,
  KeyRow,
  OptionRow,
  Press,
  SwatchKey,
  TextKey,
  ValueText,
} from '../design-system';
import { ColourAxes } from './colour-axes';
import { FoldKey, HeadingRow } from './control-rows';
import { NamingRow } from './naming-row';
import { Sheet } from './sheet';

const MAX_COLOURS = 8;
const MAX_UNDO_STEPS = 20;

type NamedColours = { id: string; name: string; family: string; colours: string[] };

type ColourEditorProps = {
  strip: ReactNode;
  isPalette: boolean;
  colours: string[];
  minimumColours: number;
  sets: NamedColours[];
  onChange: (colours: string[]) => void;
  onKeepSet: (name: string, colours: string[]) => void;
  onClose: () => void;
};

const replaceAt = (colours: string[], index: number, colour: string) =>
  colours.map((existing, position) => (position === index ? colour : existing));

function moved(colours: string[], index: number, shift: number) {
  const next = [...colours];
  const [colour] = next.splice(index, 1);
  if (colour) next.splice(index + shift, 0, colour);
  return next;
}

type SwatchSetsProps = {
  sets: NamedColours[];
  minimumColours: number;
  roomForColours: number;
  onPlace: (colour: string) => void;
  onApplySet: (colours: string[]) => void;
};

// One family at a time, so the sets stay a short list.
function SwatchSets({ sets, minimumColours, roomForColours, onPlace, onApplySet }: SwatchSetsProps) {
  const families = [...new Set(sets.map(({ family }) => family))];
  const [openFamily, setOpenFamily] = useState(families[0] ?? null);
  return families.map((family) => (
    <section key={family} className="swatch-family">
      <FoldKey
        label={family.toUpperCase()}
        isOpen={family === openFamily}
        onToggle={() => setOpenFamily(family === openFamily ? null : family)}
      />
      {family === openFamily &&
        sets
          .filter((set) => set.family === family)
          .map(({ id, name, colours }) => (
            <div key={id}>
              <div className="swatch-set-heading">
                <Eyebrow>{name.toUpperCase()}</Eyebrow>
                <TextKey
                  disabled={colours.length < minimumColours}
                  onClick={() => onApplySet(colours.slice(0, roomForColours))}
                >
                  {colours.length > roomForColours ? `USE THE FIRST ${roomForColours}` : 'USE THESE'}
                </TextKey>
              </div>
              <div className="swatches">
                {colours.map((colour, index) => (
                  <SwatchKey key={`${id}-${index}`} colour={colour} onClick={() => onPlace(colour)} />
                ))}
              </div>
            </div>
          ))}
    </section>
  ));
}

type SlotKeysProps = {
  count: number;
  canRemove: boolean;
  selected: number;
  copied: string | null;
  onCopy: () => void;
  onPaste: () => void;
  onMove: (shift: number) => void;
  onRemove: () => void;
};

function SlotKeys({ count, canRemove, selected, copied, onCopy, onPaste, onMove, onRemove }: SlotKeysProps) {
  return (
    <KeyRow>
      <TextKey onClick={onCopy}>COPY</TextKey>
      <TextKey disabled={!copied} onClick={onPaste}>
        PASTE
        {copied && <ColourFill className="paste-chip" paint={copied} />}
      </TextKey>
      <TextKey disabled={selected === 0} onClick={() => onMove(-1)}>
        <ChevronMark direction="left" />
      </TextKey>
      <TextKey disabled={selected === count - 1} onClick={() => onMove(1)}>
        <ChevronMark direction="right" />
      </TextKey>
      <TextKey disabled={!canRemove} onClick={onRemove}>
        REMOVE
      </TextKey>
    </KeyRow>
  );
}

type SlotsProps = {
  colours: string[];
  selected: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
};

function Slots({ colours, selected, onSelect, onAdd }: SlotsProps) {
  return (
    <div className="slots">
      {colours.map((colour, index) => (
        <ColourSlot
          key={`${colour}-${index}`}
          colour={colour}
          label={`Colour ${index + 1}`}
          isSelected={index === selected}
          onClick={() => onSelect(index)}
        />
      ))}
      {colours.length < MAX_COLOURS && (
        <Press className="slot-add" label="Add a colour" onClick={onAdd}>
          +
        </Press>
      )}
    </div>
  );
}

export function ColourEditor(props: ColourEditorProps) {
  const { strip, isPalette, colours, minimumColours, sets, onChange, onKeepSet, onClose } = props;
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<'swatches' | 'custom'>('swatches');
  const [copied, setCopied] = useState<string | null>(null);
  const [undoSteps, setUndoSteps] = useState<string[][]>([]);
  const [isNaming, setNaming] = useState(false);
  const current = colours[selected] ?? BLACK_HEX;

  const change = (next: string[]) => {
    setUndoSteps([...undoSteps.slice(1 - MAX_UNDO_STEPS), colours]);
    onChange(next);
  };

  // A picked swatch goes in the open slot, and the next slot opens, so a set is quick to fill in.
  const place = (colour: string) => {
    change(replaceAt(colours, selected, colour));
    setSelected(Math.min(colours.length - 1, selected + 1));
  };

  const applySet = (set: string[]) => {
    change(set);
    setSelected(0);
  };

  const move = (shift: number) => {
    change(moved(colours, selected, shift));
    setSelected(selected + shift);
  };

  const remove = () => {
    change(colours.filter((_, index) => index !== selected));
    setSelected(Math.max(0, selected - 1));
  };

  const add = () => {
    change([...colours, current]);
    setSelected(colours.length);
  };

  const undo = () => {
    const previous = undoSteps.at(-1);
    if (!previous) return;
    setUndoSteps(undoSteps.slice(0, -1));
    onChange(previous);
    setSelected(Math.min(selected, previous.length - 1));
  };

  const actions = (
    <KeyRow>
      <TextKey isQuiet disabled={undoSteps.length === 0} onClick={undo}>
        UNDO
      </TextKey>
      <TextKey onClick={onClose}>DONE</TextKey>
    </KeyRow>
  );

  const pinned = (
    <>
      {strip}
      {isPalette && <Slots colours={colours} selected={selected} onSelect={setSelected} onAdd={add} />}
    </>
  );

  return (
    <Sheet label="Edit colours" title={isPalette ? 'Palette' : 'Colour'} actions={actions} pinned={pinned}>
      {isNaming && (
        <NamingRow
          label="Name of the colour set"
          onCancel={() => setNaming(false)}
          onKeep={(name) => {
            onKeepSet(name, colours);
            setNaming(false);
          }}
        />
      )}
      {isPalette && (
        <>
          <SlotKeys
            count={colours.length}
            canRemove={colours.length > minimumColours}
            selected={selected}
            copied={copied}
            onCopy={() => setCopied(current)}
            onPaste={() => copied && change(replaceAt(colours, selected, copied))}
            onMove={move}
            onRemove={remove}
          />
          <HeadingRow heading={<ValueText>{`${colours.length} of ${MAX_COLOURS} colours`}</ValueText>}>
            <TextKey isQuiet onClick={() => setNaming(true)}>
              SAVE COLOURS
            </TextKey>
          </HeadingRow>
        </>
      )}
      <OptionRow
        label="How to pick"
        options={[
          { value: 'swatches', name: 'Swatches' },
          { value: 'custom', name: 'Custom' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'swatches' ? (
        <SwatchSets
          sets={sets}
          minimumColours={minimumColours}
          roomForColours={isPalette ? MAX_COLOURS : 1}
          onPlace={place}
          onApplySet={applySet}
        />
      ) : (
        <ColourAxes colour={current} onChange={(colour) => change(replaceAt(colours, selected, colour))} />
      )}
    </Sheet>
  );
}
