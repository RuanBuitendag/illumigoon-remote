import type { ReactNode } from 'react';
import { ChevronMark, ColourFill, Fader, Press, tintStyle } from '../design-system';

type LightSwitchProps = {
  label: string;
  isOn: boolean;
  glow: 'light' | 'room' | 'house';
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
};

// The switch is the light itself: one segment for a light, one per light for a room or the house.
export function LightSwitch({ label, isOn, glow, disabled, onToggle, children }: LightSwitchProps) {
  return (
    <Press className="light-switch" label={label} isPressed={isOn} disabled={disabled} onClick={onToggle}>
      <span className="light-square" data-glow={glow}>
        {children}
      </span>
    </Press>
  );
}

export function SwitchSegment({ paint }: { paint?: string }) {
  return <ColourFill className="switch-segment" paint={paint} />;
}

export function LightBox({ children }: { children: ReactNode }) {
  return <div className="light-box">{children}</div>;
}

type LightItemProps = {
  name: string;
  note: string;
  tint?: string;
  power: ReactNode;
  disabled: boolean;
  onOpen: () => void;
  onHold: () => void;
};

export function LightItem({ name, note, tint, power, disabled, onOpen, onHold }: LightItemProps) {
  return (
    <div className="light-item" style={tintStyle(tint)}>
      {power}
      <Press className="light-open" disabled={disabled} onClick={onOpen} onHold={onHold}>
        <span className="light-text">
          <span className="light-name">{name}</span>
          <span className="light-note">{note}</span>
        </span>
        <ChevronUp />
      </Press>
    </div>
  );
}

function ChevronUp() {
  return (
    <span className="light-chevron">
      <ChevronMark direction="up" />
    </span>
  );
}

type AddLightRowProps = { label: string; note: string; onClick: () => void };

export function AddLightRow({ label, note, onClick }: AddLightRowProps) {
  return (
    <Press className="add-light-row" onClick={onClick}>
      <span className="add-light-box">+</span>
      <span className="light-text">
        <span className="add-light-label">{label}</span>
        <span className="add-light-note">{note}</span>
      </span>
    </Press>
  );
}

type LevelLineProps = {
  label: string;
  level: number;
  isLit: boolean;
  disabled?: boolean;
  onLevel: (level: number) => void;
  children?: ReactNode;
};

export function LevelLine({ label, level, isLit, disabled, onLevel, children }: LevelLineProps) {
  return (
    <div className="level-line">
      <Fader
        label={label}
        value={level}
        min={0}
        max={1}
        step={0.01}
        disabled={disabled}
        isLit={isLit}
        onChange={onLevel}
      />
      <span className="level-value value-text">{Math.round(level * 100)}</span>
      {children}
    </div>
  );
}
