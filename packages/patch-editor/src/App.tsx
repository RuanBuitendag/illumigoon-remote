/** The Edit page: the live strip and the sections, for one light. */

import { useEffect, useState } from 'react';
import { Defs } from './ui/bits';
import type { Chosen } from './ui/PatchRail';
import { useLatest } from './ui/useLatest';
import { documentOf } from './domain/house';
import { AwaitingCatalog, EditorOverlays, EditorStage, SaveSheet } from './app/EditorStage';
import { connectNotice } from './app/useConnection';
import { useEditor, type OpenLight } from './app/useEditor';
import { editedLook, type EditedLook } from './app/usePatchDraft';
import { useSection, type EditorSection } from './app/useSection';

export type { EditedLook, EditorSection, OpenLight };

type AppProps = {
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
  onSendLook(look: EditedLook, name: string): void;
  onLeave(look: EditedLook | null): void;
  onClose(): void;
};

export default function App(props: AppProps) {
  const { light, isOpen, section, isSaving, onSaveOpen, onSaveClosed } = props;
  const { onSection, onName, onSendLook, onLeave, onClose } = props;
  const editor = useEditor(light);
  const { draft, connection, writes, nav, dialogs, canEdit } = editor;
  const { link, label, hb, info, ready, audioFeed, disconnect } = connection;
  const [chosen, setChosen] = useState<Chosen | null>(null);
  useSection(section, nav.side, nav.setSide, onSection);

  const named = useLatest(onName);
  useEffect(() => named.current(draft.patchName), [draft.patchName, named]);

  // Decided here and not by unmounting: what is still waiting goes out before the socket closes.
  const { commit } = writes;
  const left = useLatest(onLeave);
  const leaving = useLatest(draft);
  useEffect(() => {
    if (isOpen) return;
    commit();
    disconnect();
    left.current(editedLook(leaving.current));
  }, [isOpen, commit, disconnect, left, leaving]);

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
          ready={ready}
        />
      )}
      {canEdit && isSaving && (
        <SaveSheet
          draft={draft}
          chosen={chosen}
          onChoose={setChosen}
          onLoad={editor.applyPreset}
          onSend={(doc, name) => onSendLook({ type: 'patch', params: documentOf(doc) }, name)}
          say={editor.say}
          saveNudge={dialogs.saveNudge}
          onClose={onSaveClosed}
        />
      )}
    </div>
  );
}

