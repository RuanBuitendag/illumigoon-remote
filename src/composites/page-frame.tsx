import type { ReactNode } from 'react';
import { BackKey, ChevronMark, LockMark, Press, TextField, TextKey } from '../design-system';

type PageFrameProps = {
  title: string;
  intro?: string;
  backLabel: string;
  onBack: () => void;
  children?: ReactNode;
};

export function PageFrame({ title, intro, backLabel, onBack, children }: PageFrameProps) {
  return (
    <>
      <BackKey label={backLabel} onClick={onBack} />
      <h1 className="page-title">{title}</h1>
      {intro && <p className="page-intro">{intro}</p>}
      {children}
    </>
  );
}

export function PageSection({ children }: { children: ReactNode }) {
  return <section className="page-section">{children}</section>;
}

export function PageHint({ children }: { children: ReactNode }) {
  return <p className="page-hint">{children}</p>;
}

type InfoRowProps = { label: string; note: string; children?: ReactNode };

export function InfoRow({ label, note, children }: InfoRowProps) {
  return (
    <div className="info-row">
      <span className="more-text">
        <span className="more-label">{label}</span>
        <span className="more-note">{note}</span>
      </span>
      {children}
    </div>
  );
}

type DayPickerProps = { days: { name: string; isOn: boolean }[]; onToggle: (index: number) => void };

export function DayPicker({ days, onToggle }: DayPickerProps) {
  return (
    <div className="day-picker">
      {days.map(({ name, isOn }, index) => (
        <Press key={name} className="day-key" isPressed={isOn} onClick={() => onToggle(index)}>
          {name}
        </Press>
      ))}
    </div>
  );
}

export function LockStatus({ children }: { children: ReactNode }) {
  return (
    <p className="page-status">
      <LockMark />
      {children}
    </p>
  );
}

export function ScanNote({ strip, children }: { strip: ReactNode; children: ReactNode }) {
  return (
    <div className="scan-note">
      {strip}
      <PageHint>{children}</PageHint>
    </div>
  );
}

type ArrangeRowProps = {
  number: number;
  name: string;
  maxLength: number;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onMove: (shift: number) => void;
};

export function ArrangeRow({ number, name, maxLength, isFirst, isLast, onRename, onMove }: ArrangeRowProps) {
  return (
    <div className="arrange-row">
      <span className="arrange-number">{number}</span>
      <TextField
        size="small"
        label={`Name of light ${number}`}
        maxLength={maxLength}
        defaultValue={name}
        onLeave={onRename}
      />
      <TextKey disabled={isFirst} onClick={() => onMove(-1)}>
        <ChevronMark direction="up" />
      </TextKey>
      <TextKey disabled={isLast} onClick={() => onMove(1)}>
        <ChevronMark direction="down" />
      </TextKey>
    </div>
  );
}
