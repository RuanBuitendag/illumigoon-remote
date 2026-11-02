import { Press } from './keys';
import { Picked } from './text';

// Any painted area: a swatch, a box of a palette, a bar of a gradient. `paint` is any CSS background.
export function ColourFill({ paint, className }: { paint?: string; className: string }) {
  return <i className={className} style={paint ? { background: paint } : undefined} />;
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
        <ColourFill className="colour-slot-fill" paint={colour} />
      </Picked>
    </Press>
  );
}
