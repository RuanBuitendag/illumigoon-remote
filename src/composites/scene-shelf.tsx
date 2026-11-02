import type { ReactNode } from 'react';
import { ColourFill, Eyebrow, Press, TextKey } from '../design-system';
import { HeadingRow } from './control-rows';
import { QuietNote } from './home-layout';

export function MoodSegment({ gradient }: { gradient?: string }) {
  return <ColourFill className="mood-segment" paint={gradient} />;
}

type SceneCardProps = {
  name: string;
  summary: string;
  isActive: boolean;
  isEditing: boolean;
  onApply: () => void;
  onHold: () => void;
  onHoldEnd: () => void;
  onUpdate: () => void;
  onRename: () => void;
  onDelete: () => void;
  // A mood shows one segment per light. A scene shows only its name.
  children?: ReactNode;
};

export function SceneCard(props: SceneCardProps) {
  const { name, summary, isActive, isEditing, onApply, onHold, onHoldEnd, onUpdate, onRename, onDelete, children } =
    props;
  return (
    <div className="scene-card" data-active={isActive}>
      <Press className="scene-apply" disabled={isEditing} onClick={onApply} onHold={onHold} onHoldEnd={onHoldEnd}>
        <span className="scene-name">{name}</span>
        {children && <span className="mood-segments">{children}</span>}
        {isEditing && <span className="scene-summary">{summary}</span>}
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

type SceneShelfProps = {
  title: string;
  saveLabel: string;
  isMood: boolean;
  hasScenes: boolean;
  isEditing: boolean;
  note: string | null;
  onEdit: () => void;
  onSave: () => void;
  children: ReactNode;
};

export function SceneShelf(shelf: SceneShelfProps) {
  const { title, saveLabel, isMood, hasScenes, isEditing, note, onEdit, onSave, children } = shelf;
  return (
    <section className="scene-shelf" data-mood={isMood}>
      <HeadingRow heading={<Eyebrow>{title}</Eyebrow>}>
        <span className="scene-keys">
          {hasScenes && <TextKey onClick={onEdit}>{isEditing ? 'DONE' : 'EDIT'}</TextKey>}
          <Press className="scene-save" onClick={onSave}>
            {saveLabel}
          </Press>
        </span>
      </HeadingRow>
      {hasScenes && (
        <div className="scene-grid" data-editing={isEditing}>
          {children}
        </div>
      )}
      {note && <QuietNote>{note}</QuietNote>}
    </section>
  );
}
