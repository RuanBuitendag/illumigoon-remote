/** The editor inside its own frame: a top bar, the rail, and the house view behind a light. */

import { useState } from 'react';
import { useLatest } from '../ui/useLatest';
import { arrivalOf } from '../domain/house';
import { house } from '../device/house';
import { Defs } from '../ui/bits';
import { House } from '../ui/House';
import { Shell } from '../ui/Shell';
import type { Chosen } from '../ui/PatchRail';
import { useArrivalChoice } from '../ui/arrival';
import { useHouseFeed } from '../ui/houseFeed';
import { useCollapsed } from '../ui/collapsed';
import {
  AwaitingCatalog, EditorOverlays, EditorStage, LibraryRail, LightTrail, TopTools,
} from './EditorStage';
import { connectNotice, linkFailed } from './useConnection';
import { useEditor, type OpenLight } from './useEditor';

export function ChromedApp({ light, onClose }: { light: OpenLight; onClose(): void }) {
  // Opt-in, and remembered like the racks: the strip loads an engine and repaints every frame,
  // which is a cost nobody tuning a knob against the real light should pay by default.
  const [previewShut, togglePreview] = useCollapsed('preview', true);

  // The patch rail down the left of both views (ui/Shell.tsx). One chosen patch, so a patch picked
  // in the house is still the one picked with a light open.
  const [chosen, setChosen] = useState<Chosen | null>(null);
  // On a phone the library takes the whole screen, so it starts shut.
  const [railShut, toggleRail] = useCollapsed('rail', matchMedia('(max-width: 899px)').matches);
  const [houseNotice, setHouseNotice] = useState<string | null>(null);
  // Every light on the network, for the house view and the light switcher in the top bar.
  const feed = useHouseFeed();

  // How a replaced look arrives: one choice, for the house screen and the editor alike (LIFE-864).
  // Read through a ref by `pushDoc`, so choosing an arrival does not rebuild every write callback.
  const arrivalChoice = useArrivalChoice();
  const transitions = feed.transitions;
  const arrivalRef = useLatest(arrivalOf(arrivalChoice, transitions));

  const editor = useEditor(light, arrivalRef);
  const { draft, connection, nav, dialogs, canEdit, toast, say } = editor;
  const { wire, link, label, hb, info, ready, audioFeed, open, disconnect } = connection;

  const inHouse = link?.at !== 'open';

  /** Back to the house. This light's socket closes, as leaving it always did. */
  const toHouse = () => {
    disconnect();
    setHouseNotice(null);
  };

  // The same element at the same place in every branch below, so going between the house and a
  // light never remounts it: the shelf, the scroll and every strip already read stay put.
  const rail = (
    <LibraryRail
      inHouse={inHouse}
      canEdit={canEdit}
      draft={draft}
      chosen={chosen}
      onChoose={setChosen}
      onLoad={editor.applyPreset}
      say={inHouse ? setHouseNotice : say}
      shut={railShut}
      onShut={toggleRail}
      saveNudge={dialogs.saveNudge}
    />
  );

  const opened = canEdit ? (
    <EditorStage
      ctl={editor.ctl}
      nav={nav}
      rolled={editor.rolled}
      dialogs={dialogs}
      patch={draft.patch}
      master={draft.master}
      audio={audioFeed}
      onRecallMaster={editor.masterActs.recallMasterPalette}
      previewShut={previewShut}
      info={info}
      hb={hb}
      label={label}
      onLeave={disconnect}
      onSave={() => {
        if (railShut) toggleRail();
        dialogs.nudgeSave();
      }}
    />
  ) : (
    <AwaitingCatalog ready={ready} label={label} onBack={toHouse} />
  );

  return (
    <div
      className="app"
      onContextMenu={canEdit ? dialogs.exposeUnderPointer : undefined}
      {...editor.longPress}
    >
      <Defs />
      <Shell
        onClose={onClose}
        trail={
          <LightTrail
            inHouse={inHouse}
            feed={feed}
            wire={wire}
            info={info}
            hb={hb}
            label={label}
            onHouse={toHouse}
            onLight={open}
          />
        }
        rail={rail}
        railShut={railShut}
        onToggleRail={toggleRail}
        notice={inHouse ? (connectNotice(link, label) ?? houseNotice) : undefined}
        warn={inHouse && linkFailed(link)}
        tools={
          <TopTools
            inHouse={inHouse}
            onOpen={open}
            canEdit={canEdit}
            patch={draft.patch}
            ready={ready}
            previewShut={previewShut}
            onPreview={togglePreview}
            onFragments={() => dialogs.setShowFragments(true)}
            arrival={arrivalChoice}
            transitions={transitions}
            hb={hb}
            wire={wire}
          />
        }
      >
        {inHouse ? (
          <House
            feed={feed}
            port={house}
            arrival={arrivalChoice}
            chosen={chosen}
            onOpen={open}
            onNotice={setHouseNotice}
          />
        ) : (
          opened
        )}
      </Shell>
      {canEdit && (
        <EditorOverlays
          ctl={editor.ctl}
          gesture={editor.gesture}
          dialogs={dialogs}
          patch={draft.patch}
          toast={toast}
          ready={ready}
        />
      )}
    </div>
  );
}
