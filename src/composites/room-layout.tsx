import type { ReactNode } from 'react';
import { ChevronMark, Eyebrow, KeyRow, OptionRow, Press, SoundMark, TextKey, tintStyle } from '../design-system';

type RoomLayoutProps = {
  tint?: string;
  chips: { value: string; name: string }[];
  chip: string;
  onChip: (value: string) => void;
  name: string;
  stateText: string;
  power: ReactNode;
  children: ReactNode;
};

export function RoomLayout({ tint, chips, chip, onChip, name, stateText, power, children }: RoomLayoutProps) {
  return (
    <div className="tab-page room-page" style={tintStyle(tint)}>
      <nav className="room-chips" aria-label="Rooms">
        {chips.map(({ value, name: chipName }) => (
          <Press key={value} className="room-chip" isPressed={value === chip} onClick={() => onChip(value)}>
            {chipName}
          </Press>
        ))}
      </nav>
      <div className="room-title-row">
        {power}
        <div>
          <h1 className="tab-title">{name}</h1>
          <p className="tab-subtitle">{stateText}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

type LookSummaryProps = {
  name: string;
  hasSound: boolean;
  strip: ReactNode;
  onEdit?: () => void;
  onChangeLook?: () => void;
  onControls?: () => void;
  children?: ReactNode;
};

export function LookSummary({ name, hasSound, strip, onEdit, onChangeLook, onControls, children }: LookSummaryProps) {
  return (
    <section className="look-summary">
      <div className="room-heading-row">
        <Eyebrow>LOOK</Eyebrow>
      </div>
      <span className="look-summary-name">
        {name}
        {hasSound && <SoundMark />}
      </span>
      {strip}
      <KeyRow>
        {onEdit && <TextKey onClick={onEdit}>EDIT</TextKey>}
        {onChangeLook && (
          <TextKey onClick={onChangeLook}>
            CHANGE LOOK
            <ChevronMark direction="right" />
          </TextKey>
        )}
        {onControls && (
          <TextKey isQuiet onClick={onControls}>
            ALL CONTROLS
          </TextKey>
        )}
      </KeyRow>
      {children}
    </section>
  );
}

export function RoomLights({ children }: { children: ReactNode }) {
  return (
    <section className="room-lights">
      <div className="room-heading-row">
        <Eyebrow>LIGHTS</Eyebrow>
      </div>
      {children}
    </section>
  );
}

type ScopeTabsProps = {
  tabs: { value: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
};

export function ScopeTabs({ tabs, value, onChange }: ScopeTabsProps) {
  return (
    <div className="scope-tabs">
      <OptionRow label="Which lights" options={tabs} value={value} onChange={onChange} />
    </div>
  );
}

type HeroProps = {
  tint?: string;
  strip: ReactNode;
  lookName: string;
  onChangeLook?: () => void;
  onEdit?: () => void;
  children: ReactNode;
};

export function Hero({ tint, strip, lookName, onChangeLook, onEdit, children }: HeroProps) {
  return (
    <div className="hero" style={tintStyle(tint)}>
      <div className="hero-strip">{strip}</div>
      <div className="hero-look">
        <span className="hero-look-name">{lookName}</span>
        <KeyRow>
          {onEdit && <TextKey onClick={onEdit}>EDIT</TextKey>}
          {onChangeLook && (
            <TextKey onClick={onChangeLook}>
              CHANGE LOOK
              <ChevronMark direction="right" />
            </TextKey>
          )}
        </KeyRow>
      </div>
      {children}
    </div>
  );
}

type RoomSectionProps = { title?: string; eyebrow?: string; children: ReactNode };

export function RoomSection({ title, eyebrow, children }: RoomSectionProps) {
  return (
    <section className="room-section">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {title && <h2 className="section-title">{title}</h2>}
      {children}
    </section>
  );
}
