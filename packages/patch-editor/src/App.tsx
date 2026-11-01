/**
 * The editor: one patch, one socket, and the rules about which changes go out how.
 *
 * The composition root. The rules live in the hooks of `src/app`; this says how they connect.
 */

import { useEffect, useRef, useState } from 'react';
import { useLatest } from './ui/useLatest';
import { drawable } from './domain/connection';
import { arrivalOf } from './domain/house';
import { house } from './device/house';
import { Defs } from './ui/bits';
import { House } from './ui/House';
import { Shell } from './ui/Shell';
import type { Chosen } from './ui/PatchRail';
import { useArrivalChoice } from './ui/arrival';
import { useHouseFeed } from './ui/houseFeed';
import { useCollapsed } from './ui/collapsed';
import {
  AwaitingCatalog, EditorOverlays, EditorStage, LibraryRail, LightTrail, TopTools,
} from './app/EditorStage';
import { useBindGesture, type Gesture } from './app/useBindGesture';
import { connectNotice, linkFailed, useConnection } from './app/useConnection';
import { useCtl } from './app/useCtl';
import { useDialogs } from './app/useDialogs';
import { useLongPress } from './app/useLongPress';
import { useMasterPalette } from './app/useMasterPalette';
import { useNavigation } from './app/useNavigation';
import { usePatchDraft } from './app/usePatchDraft';
import { usePatchWrites } from './app/usePatchWrites';
import { usePresetLoad } from './app/usePresetLoad';
import { useRolls } from './app/useRolls';
import { useToast } from './app/useToast';

/** A light to open: its socket address, and what to call it until it answers. */
export type OpenLight = { url: string; name: string };

type AppProps = { light?: OpenLight; onClose(): void };

export default function App({ light, onClose }: AppProps) {
  const { toast, say } = useToast();
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

  /** The in-flight gesture, held in a ref so pointerup reads the target the last move set. */
  const dragRef = useRef<Gesture | null>(null);

  const draft = usePatchDraft();
  const connection = useConnection({ ...draft, say, dragRef });
  const { wire, link, label, hb, info, ready, audioFeed, open, disconnect } = connection;
  const writes = usePatchWrites({ ...draft, wire, arrivalRef });
  const nav = useNavigation(draft.patch);
  const masterActs = useMasterPalette({ ...draft, ...writes, wire, sel: nav.sel });
  const applyPreset = usePresetLoad({ ...draft, ...writes, ...nav, link, say });
  const rolled = useRolls({ ...draft, ...writes, ...nav, say });
  const gesture = useBindGesture({ ...draft, ...writes, dragRef, say });
  const ctl = useCtl({ draft, writes, nav, gesture, masterActs, say });
  const dialogs = useDialogs();

  // Opens once. Leaving a light after that goes to the house view, and not back to this light.
  const firstLight = useRef(light);
  useEffect(() => {
    if (firstLight.current) open(firstLight.current.url, firstLight.current.name);
    firstLight.current = undefined;
  }, [open]);

  const inHouse = link?.at !== 'open';
  const canEdit = !inHouse && drawable(ready);

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
      onLoad={applyPreset}
      say={say}
      onNotice={setHouseNotice}
      shut={railShut}
      onShut={toggleRail}
      saveNudge={dialogs.saveNudge}
    />
  );

  const editor = (
    <EditorStage
      ctl={ctl}
      nav={nav}
      rolled={rolled}
      dialogs={dialogs}
      patch={draft.patch}
      master={draft.master}
      audio={audioFeed}
      onRecallMaster={masterActs.recallMasterPalette}
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
  );

  const longPress = useLongPress((target, x, y) => {
    if (canEdit) dialogs.exposeAtPoint(target, x, y);
  });

  const opened = canEdit ? (
    editor
  ) : (
    <AwaitingCatalog ready={ready} label={label} onHouse={toHouse} />
  );

  return (
    <div className="app" onContextMenu={canEdit ? dialogs.exposeUnderPointer : undefined} {...longPress}>
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
          ctl={ctl}
          gesture={gesture}
          dialogs={dialogs}
          patch={draft.patch}
          toast={toast}
          ready={ready}
        />
      )}
    </div>
  );
}
