import type { ReactNode } from 'react';
import { Eyebrow, Press } from '../design-system';

type OverlayProps = { label: string; children: ReactNode };

export function Overlay({ label, children }: OverlayProps) {
  return (
    <section className="overlay" role="dialog" aria-label={label}>
      <Eyebrow>{label.toUpperCase()}</Eyebrow>
      {children}
    </section>
  );
}

export function OverlayBlock({ label, children }: OverlayProps) {
  return (
    <div>
      <p className="overlay-label">{label}</p>
      {children}
    </div>
  );
}

export function OverlayText({ children }: { children: ReactNode }) {
  return <p className="overlay-text">{children}</p>;
}

type ChoiceRowProps = { name: string; isChosen: boolean; onClick: () => void };

function ChoiceRow({ name, isChosen, onClick }: ChoiceRowProps) {
  return (
    <Press className="choice-row" isPressed={isChosen} onClick={onClick}>
      <i className="choice-mark" />
      {name}
    </Press>
  );
}

type ChoiceListProps = {
  choices: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
};

export function ChoiceList({ choices, value, onChange }: ChoiceListProps) {
  return choices.map(({ id, name }) => (
    <ChoiceRow key={id} name={name} isChosen={id === value} onClick={() => onChange(id)} />
  ));
}

type WhichLightsProps = {
  rooms: { id: string; name: string; lights: { id: string; name: string }[] }[];
  picked: string[];
  onToggle: (id: string) => void;
};

export function WhichLights({ rooms, picked, onToggle }: WhichLightsProps) {
  return rooms.map(({ id, name, lights }) => (
    <OverlayBlock key={id} label={name}>
      {lights.map((light) => (
        <ChoiceRow
          key={light.id}
          name={light.name}
          isChosen={picked.includes(light.id)}
          onClick={() => onToggle(light.id)}
        />
      ))}
    </OverlayBlock>
  ));
}
