import { Picked, Press } from '../design-system';

type ChoiceListProps = {
  label: string;
  choices: { id: string; name: string }[];
  chosen: string[];
  onChoose: (id: string) => void;
};

// One row per choice, packed as Edit packs its layer rows; a chosen row carries the side mark (D63).
export function ChoiceList({ label, choices, chosen, onChoose }: ChoiceListProps) {
  return (
    <div className="choice-list" role="group" aria-label={label}>
      {choices.map(({ id, name }) => (
        <Press key={id} className="choice-row" isPressed={chosen.includes(id)} onClick={() => onChoose(id)}>
          <Picked isOn={chosen.includes(id)} edge="side" />
          {name}
        </Press>
      ))}
    </div>
  );
}
