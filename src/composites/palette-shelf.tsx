import { ChevronMark, ColourFill, Eyebrow, gradientOf, hexToColour, Picked, Press } from '../design-system';

export type ColourSet = { id: string; name: string; family: string; colours: string[] };

type PaletteShelfProps = {
  sets: ColourSet[];
  current: string[];
  maxColours: number;
  minimumColours: number;
  onApply: (colours: string[]) => void;
};

const isSameColours = (one: string[], other: string[]) =>
  one.length === other.length && one.every((colour, index) => colour.toLowerCase() === other[index]?.toLowerCase());

const paintOf = (colours: string[]) => (colours.length > 1 ? gradientOf(colours.map(hexToColour)) : colours[0]);

type CurrentPaletteProps = {
  label: string;
  colours: string[];
  ownName?: string;
  sets: ColourSet[];
  maxColours: number;
  isOpen: boolean;
  onClick: () => void;
};

// The palette in use, and the way in to everything else about colour.
export function CurrentPalette({ label, colours, ownName, sets, maxColours, isOpen, onClick }: CurrentPaletteProps) {
  const match = sets.find((set) => isSameColours(set.colours.slice(0, maxColours), colours));
  const name = match?.name ?? ownName ?? 'Custom';
  return (
    <Press className="palette-current" label={`${label}: ${name}`} onClick={onClick}>
      <ColourFill className="palette-bar" paint={paintOf(colours)} />
      <span className="palette-current-name">
        {name}
        <ChevronMark direction={isOpen ? 'up' : 'down'} />
      </span>
    </Press>
  );
}

// Each family is one sideways row, so every palette is open and the page stays short.
export function PaletteShelf({ sets, current, maxColours, minimumColours, onApply }: PaletteShelfProps) {
  const families = [...new Set(sets.map(({ family }) => family))];
  return families.map((family) => (
    <section key={family} className="palette-family">
      <Eyebrow>{family.toUpperCase()}</Eyebrow>
      <div className="palette-row">
        {sets
          .filter((set) => set.family === family)
          .map(({ id, name, colours }) => {
            const fitted = colours.slice(0, maxColours);
            const isCurrent = isSameColours(fitted, current);
            return (
              <Press
                key={id}
                className="palette-key"
                isPressed={isCurrent}
                disabled={colours.length < minimumColours}
                onClick={() => onApply(fitted)}
              >
                <ColourFill className="palette-bar" paint={paintOf(fitted)} />
                <Picked isOn={isCurrent}>{name}</Picked>
              </Press>
            );
          })}
      </div>
    </section>
  ));
}
