import type { ReactNode } from 'react';
import { Eyebrow, Press, TextKey } from '../design-system';
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
  const { name, summary, isEditing, onApply, onHold, onHoldEnd, onUpdate, onRename, onDelete, children } = props;
  return (
    <div className="scene-card">
      <Press className="scene-apply" disabled={isEditing} onClick={onApply} onHold={onHold} onHoldEnd={onHoldEnd}>
        <span className="scene-name">{name}</span>
        {children}
        <span className="scene-summary">{summary}</span>
      </Press>
      {isEditing && (
        <span className="scene-edit">
          <Press onClick={onUpdate}>Update</Press>
          <Press onClick={onRename}>Rename</Press>
          <Press onClick={onDelete}>Delete</Press>
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
  hasScenes: boolean;
  isEditing: boolean;
  note: string | null;
  onEdit: () => void;
  onSave: () => void;
  onRecent?: () => void;
  children: ReactNode;
};

export function SceneShelf(props: SceneShelfProps) {
  const { hasScenes, isEditing, note, onEdit, onSave, onRecent, children } = props;
  return (
    <section className="scene-shelf">
      <HeadingRow heading={<Eyebrow>SCENES</Eyebrow>}>
        <span className="scene-keys">
          {onRecent && <TextKey onClick={onRecent}>RECENT</TextKey>}
          {hasScenes && <TextKey onClick={onEdit}>{isEditing ? 'DONE' : 'MANAGE'}</TextKey>}
          <TextKey onClick={onSave}>+ SAVE</TextKey>
        </span>
      </HeadingRow>
      {hasScenes && <div className="scene-list">{children}</div>}
      {note && <QuietNote>{note}</QuietNote>}
    </section>
  );
}
