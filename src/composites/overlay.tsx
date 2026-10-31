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

type ChoiceListProps = {
  choices: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
};

export function ChoiceList({ choices, value, onChange }: ChoiceListProps) {
  return choices.map(({ id, name }) => (
    <Press key={id} className="choice-row" isPressed={id === value} onClick={() => onChange(id)}>
      <i className="choice-mark" />
      {name}
    </Press>
  ));
}
