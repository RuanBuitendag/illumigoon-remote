/** The Edit page: the live strip and the sections, for one light. */

import { useEffect, useRef, useState } from 'react';
import { Defs } from './ui/bits';
import type { Chosen } from './ui/PatchRail';
import { useLatest } from './ui/useLatest';
import type { Arrival } from './domain/house';
import { ChromedApp } from './app/ChromedApp';
import { AwaitingCatalog, EditorOverlays, EditorStage, SaveSheet } from './app/EditorStage';
import { connectNotice } from './app/useConnection';
import { useEditor, type OpenLight } from './app/useEditor';

export type { OpenLight };

type AppProps = {
  light: OpenLight;
  /** False once the page has been left: the socket closes, and `onLeave` says it is done. */
  isOpen: boolean;
  isSaving: boolean;
  withChrome: boolean;
  onSaveOpen(): void;
  onSaveClosed(): void;
  onName(name: string): void;
  onLeave(): void;
  onClose(): void;
};

function EditPage(props: Omit<AppProps, 'withChrome'>) {
  const { light, isOpen, isSaving, onSaveOpen, onSaveClosed, onName, onLeave, onClose } = props;
  // No choice to read: the look arrives the way the light's own transition says.
  const arrivalRef = useRef<Arrival>(null);
  const editor = useEditor(light, arrivalRef);
  const { draft, connection, writes, nav, dialogs, canEdit } = editor;
  const { link, label, hb, info, ready, audioFeed, disconnect } = connection;
  const [chosen, setChosen] = useState<Chosen | null>(null);

  const named = useLatest(onName);
  useEffect(() => named.current(draft.patchName), [draft.patchName, named]);

  // Decided here and not by unmounting: what is still waiting goes out before the socket closes.
  const { commit } = writes;
  const left = useLatest(onLeave);
  useEffect(() => {
    if (isOpen) return;
    commit();
    disconnect();
    left.current();
  }, [isOpen, commit, disconnect, left]);

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
          previewShut={false}
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
          say={editor.say}
          saveNudge={dialogs.saveNudge}
          onClose={onSaveClosed}
        />
      )}
    </div>
  );
}

export default function App({ withChrome, ...page }: AppProps) {
  return withChrome ? (
    <ChromedApp light={page.light} onClose={page.onClose} />
  ) : (
    <EditPage {...page} />
  );
}
