import type { ReactNode } from 'react';
import { AddKey, ColourFill, Eyebrow, Press, TextKey } from '../design-system';
import { HeadingRow } from './control-rows';
import { QuietNote } from './room-card';

export function SceneLine({ tag, gradient }: { tag: string; gradient?: string }) {
  return (
    <span className="scene-line">
      <span className="scene-tag">{tag}</span>
      <ColourFill className="scene-bar" paint={gradient} />
    </span>
  );
}

type SceneCardProps = {
  name: string;
  summary: string;
  isEditing: boolean;
  onApply: () => void;
  onRename: () => void;
  onDelete: () => void;
  children: ReactNode;
};

export function SceneCard({ name, summary, isEditing, onApply, onRename, onDelete, children }: SceneCardProps) {
  return (
    <div className="scene-card">
      <Press className="scene-apply" disabled={isEditing} onClick={onApply}>
        <span className="scene-name">{name}</span>
        {children}
        <span className="scene-summary">{summary}</span>
      </Press>
      {isEditing && (
        <span className="scene-edit">
          <Press onClick={onRename}>Rename</Press>
          <Press onClick={onDelete}>Delete</Press>
        </span>
      )}
    </div>
  );
}

type SceneShelfProps = {
  hasScenes: boolean;
  isEditing: boolean;
  note: string | null;
  onEdit: () => void;
  onSave: () => void;
  children: ReactNode;
};

export function SceneShelf({ hasScenes, isEditing, note, onEdit, onSave, children }: SceneShelfProps) {
  return (
    <section className="scene-shelf">
      <HeadingRow heading={<Eyebrow>SCENES</Eyebrow>}>
        {hasScenes && <TextKey onClick={onEdit}>{isEditing ? 'DONE' : 'EDIT'}</TextKey>}
      </HeadingRow>
      <div className="scene-list">
        {children}
        <span className="scene-add">
          <AddKey onClick={onSave}>+ Save scene</AddKey>
        </span>
      </div>
      {note && <QuietNote>{note}</QuietNote>}
    </section>
  );
}
