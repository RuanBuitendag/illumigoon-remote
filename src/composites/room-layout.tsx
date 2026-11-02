import type { ReactNode } from 'react';
import { BackKey, ChevronMark, Eyebrow, KeyRow, Picked, Press, TextKey } from '../design-system';
import { HeadingRow } from './control-rows';

type RoomLayoutProps = {
  name: string;
  power: ReactNode;
  backLabel: string;
  onBack: () => void;
  children: ReactNode;
};

export function RoomLayout({ name, power, backLabel, onBack, children }: RoomLayoutProps) {
  return (
    <div className="room-scroll">
      <BackKey label={backLabel} onClick={onBack} />
      <div className="room-title-row">
        <h1 className="page-title">{name}</h1>
        {power}
      </div>
      {children}
    </div>
  );
}

type LookHeadingProps = {
  name: string;
  onReset?: () => void;
  onEdit?: () => void;
  onLooks: () => void;
};

export function LookHeading({ name, onReset, onEdit, onLooks }: LookHeadingProps) {
  return (
    <div className="look-heading">
      <span className="look-heading-name">{name}</span>
      <KeyRow>
        {onReset && <TextKey onClick={onReset}>RESET</TextKey>}
        {onEdit && <TextKey onClick={onEdit}>EDIT</TextKey>}
        <TextKey onClick={onLooks}>
          LOOKS
          <ChevronMark direction="right" />
        </TextKey>
      </KeyRow>
    </div>
  );
}

type RoomSectionProps = { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode };

export function RoomSection({ title, eyebrow, action, children }: RoomSectionProps) {
  return (
    <section className="room-section">
      {eyebrow && <HeadingRow heading={<Eyebrow>{eyebrow}</Eyebrow>}>{action}</HeadingRow>}
      {title && <h2 className="section-title">{title}</h2>}
      {children}
    </section>
  );
}

type LightCardProps = {
  name: string;
  note: string;
  isChosen: boolean;
  disabled: boolean;
  strip: ReactNode;
  power: ReactNode;
  onChoose: () => void;
  onHold: () => void;
};

export function LightCard({ name, note, isChosen, disabled, strip, power, onChoose, onHold }: LightCardProps) {
  const press = { disabled, onClick: onChoose, onHold, isPressed: isChosen };
  return (
    <div className="light-card">
      <div className="light-card-top">
        <Press className="light-pick" {...press}>
          <Picked isOn={isChosen}>{name}</Picked>
          {note && <span className="note light-note">{note}</span>}
        </Press>
        {power}
      </div>
      <Press className="light-tape" label={`Choose ${name}`} {...press}>
        {strip}
      </Press>
    </div>
  );
}

type MoreRowProps = { label: string; note?: string; onOpen: () => void };

export function MoreRow({ label, note, onOpen }: MoreRowProps) {
  return (
    <Press className="more-row" onClick={onOpen}>
      <span className="more-text">
        <span className="more-label">{label}</span>
        {note && <span className="note">{note}</span>}
      </span>
      <ChevronMark direction="right" />
    </Press>
  );
}
