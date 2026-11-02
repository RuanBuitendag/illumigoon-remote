import type { ReactNode } from 'react';
import { Eyebrow, Picked, Press, TextKey } from '../design-system';
import { HeadingRow } from './control-rows';
import { QuietNote } from './room-card';

export function SceneLine({ name, strip }: { name: string; strip?: ReactNode }) {
  return (
    <span className="scene-line">
      <span className="scene-tag">{name}</span>
      {strip}
    </span>
  );
}

type SceneCardProps = {
  name: string;
  summary: string;
  isCurrent?: boolean;
  isEditing: boolean;
  onApply: () => void;
  onHold: () => void;
  onHoldEnd: () => void;
  onUpdate: () => void;
  onRename: () => void;
  onDelete: () => void;
  children: ReactNode;
};

export function SceneCard(props: SceneCardProps) {
  const { name, summary, isCurrent, isEditing, onApply, onHold, onHoldEnd, onUpdate, onRename, onDelete, children } = props;
  return (
    <div className="scene-card">
      <Press className="scene-apply" disabled={isEditing} onClick={onApply} onHold={onHold} onHoldEnd={onHoldEnd}>
        <span className="scene-name">
          <Picked isOn={isCurrent}>{name}</Picked>
        </span>
        {children}
        <span className="scene-summary">{summary}</span>
      </Press>
      {isEditing && (
        <span className="scene-edit">
          <TextKey onClick={onUpdate}>UPDATE</TextKey>
          <TextKey onClick={onRename}>RENAME</TextKey>
          <TextKey onClick={onDelete}>DELETE</TextKey>
        </span>
      )}
    </div>
  );
}

type StateCardProps = {
  name: string;
  summary: string;
  onApply: () => void;
  onHold: () => void;
  onHoldEnd: () => void;
  onKeep: () => void;
  children: ReactNode;
};

export function StateCard({ name, summary, onApply, onHold, onHoldEnd, onKeep, children }: StateCardProps) {
  return (
    <div className="state-card">
      <Press className="scene-apply" onClick={onApply} onHold={onHold} onHoldEnd={onHoldEnd}>
        <span className="scene-name">{name}</span>
        {children}
        <span className="scene-summary">{summary}</span>
      </Press>
      <TextKey onClick={onKeep}>KEEP</TextKey>
    </div>
  );
}

export function StateList({ children }: { children: ReactNode }) {
  return <div className="state-list">{children}</div>;
}

type SceneShelfProps = {
  title: string;
  current?: { text: string; isChanged: boolean };
  hasScenes: boolean;
  isEditing: boolean;
  note: string | null;
  onEdit: () => void;
  onSave: () => void;
  onUpdate?: () => void;
  onRecent?: () => void;
  children: ReactNode;
};

export function SceneShelf(props: SceneShelfProps) {
  const { title, current, hasScenes, isEditing, note, onEdit, onSave, onUpdate, onRecent, children } = props;
  return (
    <section className="scene-shelf">
      <HeadingRow heading={<Eyebrow>{title}</Eyebrow>}>
        <span className="scene-keys">
          {onRecent && <TextKey onClick={onRecent}>RECENT</TextKey>}
          {onUpdate && <TextKey onClick={onUpdate}>UPDATE</TextKey>}
          {hasScenes && <TextKey onClick={onEdit}>{isEditing ? 'DONE' : 'MANAGE'}</TextKey>}
          <TextKey onClick={onSave}>+ SAVE</TextKey>
        </span>
      </HeadingRow>
      {current?.text && (
        <p className="scene-current" data-changed={current.isChanged}>
          {current.text}
        </p>
      )}
      {hasScenes && <div className="scene-list">{children}</div>}
      {note && <QuietNote>{note}</QuietNote>}
    </section>
  );
}
