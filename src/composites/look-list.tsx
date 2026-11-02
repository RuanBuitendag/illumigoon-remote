import type { ReactNode } from 'react';
import { ChevronMark, Eyebrow, Press, SoundMark } from '../design-system';
import { HeadingRow } from './control-rows';

type HoldProps = { onPick: () => void; onHold: () => void; onHoldEnd: () => void };

type LookItemProps = HoldProps & {
  name: string;
  description?: string;
  note?: string | null;
  hasSound: boolean;
  isPlaying: boolean;
  disabled?: boolean;
  strip: ReactNode;
  // Keys under the look, while its group is being edited.
  actions?: ReactNode;
  children?: ReactNode;
};

export function LookItem({ actions, children, ...look }: LookItemProps) {
  const { name, description, note, hasSound, isPlaying, disabled, strip, onPick, onHold, onHoldEnd } = look;
  return (
    <div className="look-row">
      <Press
        className="look-item"
        isPressed={isPlaying}
        disabled={disabled}
        onClick={onPick}
        onHold={onHold}
        onHoldEnd={onHoldEnd}
      >
        <span className="look-item-heading">
          <span className="look-item-name">{name}</span>
          {hasSound && <SoundMark />}
          {isPlaying && <span className="look-playing">PLAYING</span>}
        </span>
        {description && <span className="look-description">{description}</span>}
        {note && <span className="look-description">{note}</span>}
        {strip}
      </Press>
      {children}
      {actions && <div className="look-actions">{actions}</div>}
    </div>
  );
}

type LookPresetProps = HoldProps & { name: string; place: string; isPlaying: boolean; action?: ReactNode };

export function LookPreset({ name, place, isPlaying, action, onPick, onHold, onHoldEnd }: LookPresetProps) {
  return (
    <div className="look-preset">
      <Press
        className="look-preset-press"
        isPressed={isPlaying}
        onClick={onPick}
        onHold={onHold}
        onHoldEnd={onHoldEnd}
      >
        <span className="look-preset-name">{name}</span>
        <span className="look-playing">{isPlaying ? 'PLAYING' : place}</span>
      </Press>
      {action}
    </div>
  );
}

type LookElsewhereProps = { name: string; description: string; action: ReactNode };

// A published look that is not in the folder. It cannot play until it has been fetched.
export function LookElsewhere({ name, description, action }: LookElsewhereProps) {
  return (
    <div className="look-row">
      <span className="look-item-heading">
        <span className="look-item-name">{name}</span>
        <span className="look-elsewhere-action">{action}</span>
      </span>
      {description && <span className="look-description">{description}</span>}
    </div>
  );
}

type LookGroupProps = { title: string; note?: string; action?: ReactNode; children: ReactNode };

export function LookGroup({ title, note, action, children }: LookGroupProps) {
  return (
    <section className="library-group">
      <HeadingRow heading={<Eyebrow>{title.toUpperCase()}</Eyebrow>}>{action}</HeadingRow>
      {note && <p className="library-note">{note}</p>}
      {children}
    </section>
  );
}

export function WhichLine({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <Press className="which-line" onClick={onClick}>
      {text}
      <ChevronMark direction="right" />
    </Press>
  );
}

export function LookProblem({ children }: { children: ReactNode }) {
  return <p className="look-description">{children}</p>;
}

export function LookList({ children }: { children: ReactNode }) {
  return <div className="library">{children}</div>;
}
