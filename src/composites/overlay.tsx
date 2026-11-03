import type { ReactNode } from 'react';
import { Eyebrow, Picked, Press } from '../design-system';
import { Sheet, SheetBody } from './sheet';

type OverlayProps = { label: string; actions: ReactNode; children: ReactNode; onClose: () => void };

export function Overlay({ label, actions, children, onClose }: OverlayProps) {
  return (
    <Sheet label={label} actions={actions} onClose={onClose}>
      <SheetBody>{children}</SheetBody>
    </Sheet>
  );
}

export function OverlayBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Eyebrow>{label.toUpperCase()}</Eyebrow>
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
      <Picked isOn={isChosen}>{name}</Picked>
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
