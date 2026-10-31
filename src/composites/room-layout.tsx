import type { ReactNode } from 'react';
import { BackKey, ChevronMark, Eyebrow, OptionRow, Press, StatusMark, TextKey, tintStyle } from '../design-system';

type RoomLayoutProps = {
  name: string;
  countText: string;
  backLabel: string;
  onBack: () => void;
  children: ReactNode;
};

export function RoomLayout({ name, countText, backLabel, onBack, children }: RoomLayoutProps) {
  return (
    <div className="room-scroll">
      <BackKey label={backLabel} onClick={onBack} />
      <h1 className="room-title">{name}</h1>
      <p className="room-count">{countText}</p>
      {children}
    </div>
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
  children: ReactNode;
};

export function Hero({ tint, strip, lookName, onChangeLook, children }: HeroProps) {
  return (
    <div className="hero" style={tintStyle(tint)}>
      <div className="hero-strip">{strip}</div>
      <div className="hero-look">
        <span className="hero-look-name">{lookName}</span>
        {onChangeLook && (
          <TextKey onClick={onChangeLook}>
            CHANGE LOOK
            <ChevronMark direction="right" />
          </TextKey>
        )}
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

type LightRowProps = {
  name: string;
  status: string;
  state: 'on' | 'off' | 'silent';
  disabled: boolean;
  onClick: () => void;
};

export function LightRow({ name, status, state, disabled, onClick }: LightRowProps) {
  return (
    <Press className="light-row" disabled={disabled} onClick={onClick}>
      <span>{name}</span>
      <span className="light-status">{status}</span>
      <StatusMark state={state} />
    </Press>
  );
}

type MoreRowProps = { label: string; note: string; onOpen: () => void };

export function MoreRow({ label, note, onOpen }: MoreRowProps) {
  return (
    <Press className="more-row" onClick={onOpen}>
      <span className="more-text">
        <span className="more-label">{label}</span>
        <span className="more-note">{note}</span>
      </span>
      <ChevronMark direction="right" />
    </Press>
  );
}
