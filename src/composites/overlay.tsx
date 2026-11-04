import type { ReactNode } from 'react';
import { Eyebrow } from '../design-system';
import { ChoiceList } from './choice-list';
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

type WhichLightsProps = {
  rooms: { id: string; name: string; lights: { id: string; name: string }[] }[];
  picked: string[];
  onToggle: (id: string) => void;
};

export function WhichLights({ rooms, picked, onToggle }: WhichLightsProps) {
  return rooms.map(({ id, name, lights }) => (
    <OverlayBlock key={id} label={name}>
      <ChoiceList label={name} choices={lights} chosen={picked} onChoose={onToggle} />
    </OverlayBlock>
  ));
}
