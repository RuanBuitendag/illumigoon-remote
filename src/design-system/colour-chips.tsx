import { Press } from './keys';
import { Picked } from './text';

// Any painted area: a swatch, a box of a palette, a bar of a gradient. `paint` is any CSS background.
export function ColourFill({ paint, className }: { paint?: string; className: string }) {
  return <i className={className} style={paint ? { background: paint } : undefined} />;
}

type SwatchProps = {
  // Any CSS colour. With onPick it must be a hex colour, as the system picker takes only that.
  colour: string;
  label?: string;
  disabled?: boolean;
  // Makes the swatch a key that opens the system colour picker, and hands back the hex it picked.
  onPick?: (hex: string) => void;
};

// The one swatch, in the app and in Edit: a box painted one colour, with a fine edge so a pale
// colour still shows its shape. Its size comes from where it sits.
export function Swatch({ colour, label, disabled, onPick }: SwatchProps) {
  if (!onPick) return <ColourFill className="swatch" paint={colour} />;
  return (
    <input
      className="swatch"
      type="color"
      aria-label={label}
      value={colour}
      disabled={disabled}
      onChange={(event) => onPick(event.target.value)}
    />
  );
}

type ColourSlotProps = {
  colour: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
};

export function ColourSlot({ colour, label, isSelected, onClick }: ColourSlotProps) {
  return (
    <Press className="colour-slot" label={label} isPressed={isSelected} onClick={onClick}>
      <Picked isOn={isSelected}>
        <Swatch colour={colour} />
      </Picked>
    </Press>
  );
}
