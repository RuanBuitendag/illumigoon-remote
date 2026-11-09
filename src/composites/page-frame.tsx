import type { ReactNode } from 'react';
import { BackKey, Icon, Picked, Press, TextField } from '../design-system';

type PageFrameProps = {
  title: string;
  // One key beside the title, such as + NEW LOOK.
  action?: ReactNode;
  intro?: string;
  // A place of the bar has no way back.
  backLabel?: string;
  onBack?: () => void;
  children?: ReactNode;
};

export function PageFrame({ title, action, intro, backLabel, onBack, children }: PageFrameProps) {
  return (
    <>
      {backLabel && onBack && <BackKey label={backLabel} onClick={onBack} />}
      <div className="page-title-row">
        <h1 className="page-title">{title}</h1>
        {action}
      </div>
      {intro && <p className="page-intro">{intro}</p>}
      {children}
    </>
  );
}

export function PageSection({ children }: { children: ReactNode }) {
  return <section className="page-section">{children}</section>;
}

// A list or page with nothing in it yet: what is missing, then the one step that fills it (D106).
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="page-section empty-state">
      <p className="empty-title">{title}</p>
      {children}
    </section>
  );
}

export function PageHint({ children }: { children: ReactNode }) {
  return <p className="note">{children}</p>;
}

type InfoRowProps = { label: string; note: string; onOpen?: () => void; children?: ReactNode };

export function InfoRow({ label, note, onOpen, children }: InfoRowProps) {
  const text = (
    <span className="more-text">
      <span className="more-label">{label}</span>
      <span className="note">{note}</span>
    </span>
  );
  return (
    <div className="info-row">
      {onOpen ? (
        <Press className="info-open" onClick={onOpen}>
          {text}
        </Press>
      ) : (
        text
      )}
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
          <Picked isOn={isOn}>{name}</Picked>
        </Press>
      ))}
    </div>
  );
}

export function LockStatus({ children }: { children: ReactNode }) {
  return (
    <p className="page-status">
      <Icon.Lock c="currentColor" />
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
  name: string;
  maxLength: number;
  hasGrip: boolean;
  onRename: (name: string) => void;
  action?: ReactNode;
};

export function ArrangeRow({ name, maxLength, hasGrip, onRename, action }: ArrangeRowProps) {
  return (
    <div className="arrange-row">
      {hasGrip && (
        <Press className="arrange-grip" label={`Move ${name}`} onClick={() => undefined}>
          <Icon.Grip />
        </Press>
      )}
      <TextField size="small" label={`Name of ${name}`} maxLength={maxLength} defaultValue={name} onLeave={onRename} />
      {action}
    </div>
  );
}
