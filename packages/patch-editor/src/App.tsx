/** The Edit page: the live strip and the sections, for one light. */

import { useEffect } from 'react';
import { Defs } from './ui/bits';
import { useLatest } from './ui/useLatest';
import { AwaitingCatalog, EditorOverlays, EditorStage, SaveSheet } from './app/EditorStage';
import { connectNotice } from './app/useConnection';
import { useEditor, type OpenLight } from './app/useEditor';
import { editedLook, lookOf, type EditedLook } from './app/usePatchDraft';
import { useSection, type EditorSection } from './app/useSection';

export type { EditedLook, EditorSection, OpenLight };

export type EditorPageProps = {
  light: OpenLight;
  /** False once the page has been left: the socket closes, and `onLeave` says it is done. */
  isOpen: boolean;
  /** Below 900 px only. */
  section: EditorSection;
  isSaving: boolean;
  onSaveOpen(): void;
  onSaveClosed(): void;
  onSection(section: EditorSection): void;
  onName(name: string): void;
  /** The light has said what it plays, and the editor shows it. */
  onOpened(look: EditedLook): void;
  /** Whether the look has changes no file holds yet. */
  onUnsaved?(isUnsaved: boolean): void;
  /** The socket has closed. Carries the document on the light if this session changed it. */
  onLeave(look: EditedLook | null, isSaved: boolean): void;
  /** The light cannot be edited. */
  onClose(): void;
};

export default function App(props: EditorPageProps) {
  const { light, isOpen, section, isSaving, onSaveOpen, onSaveClosed } = props;
  const { onSection, onName, onOpened, onUnsaved, onLeave, onClose } = props;
  const editor = useEditor(light);
  const { draft, connection, writes, nav, dialogs, canEdit } = editor;
  const { link, label, hb, info, ready, audioFeed, disconnect } = connection;
  useSection(section, nav.side, nav.setSide, onSection);

  const named = useLatest(onName);
  useEffect(() => named.current(draft.patchName), [draft.patchName, named]);

  // Once: the app's strips draw what the light plays, which is what the editor opened on.
  const opened = useLatest(onOpened);
  const current = useLatest(draft);
  const isEditing = ready.at === 'editing';
  useEffect(() => {
    if (isEditing) opened.current(lookOf(current.current));
  }, [isEditing, opened, current]);

  const unsaved = useLatest(onUnsaved);
  const { patch, saves, hasEditedRef, savedPatchRef } = draft;
  useEffect(() => {
    unsaved.current?.(hasEditedRef.current && savedPatchRef.current !== patch);
  }, [patch, saves, hasEditedRef, savedPatchRef, unsaved]);

  // Decided here and not by unmounting: what is still waiting goes out before the socket closes.
  const { commit } = writes;
  const left = useLatest(onLeave);
  useEffect(() => {
    if (isOpen) return;
    commit();
    disconnect();
    const leaving = current.current;
    left.current(editedLook(leaving), leaving.savedPatchRef.current === leaving.patchRef.current);
  }, [isOpen, commit, disconnect, left, current]);

  return (
    <div
      className="app"
      onContextMenu={canEdit ? dialogs.exposeUnderPointer : undefined}
      {...editor.longPress}
    >
      <Defs />
      {canEdit ? (
        <EditorStage
          ctl={editor.ctl}
          nav={nav}
          rolled={editor.rolled}
          dialogs={dialogs}
          patch={draft.patch}
          master={draft.master}
          audio={audioFeed}
          onRecallMaster={editor.masterActs.recallMasterPalette}
          section={section}
          info={info}
          hb={hb}
          label={label}
          history={editor.history}
          onLeave={onClose}
          onSave={() => {
            onSaveOpen();
            dialogs.nudgeSave();
          }}
        />
      ) : (
        <AwaitingCatalog
          ready={ready}
          label={label}
          notice={connectNotice(link, label)}
          onBack={onClose}
        />
      )}
      {canEdit && (
        <EditorOverlays
          ctl={editor.ctl}
          gesture={editor.gesture}
          dialogs={dialogs}
          patch={draft.patch}
          toast={editor.toast}
          onUndo={() => {
            editor.hush();
            editor.history.undo();
          }}
          ready={ready}
        />
      )}
      {canEdit && isSaving && (
        <SaveSheet
          draft={draft}
          say={editor.say}
          saveNudge={dialogs.saveNudge}
          onClose={onSaveClosed}
        />
      )}
    </div>
  );
}

