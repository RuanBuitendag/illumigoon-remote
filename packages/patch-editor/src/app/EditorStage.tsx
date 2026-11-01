/** What stands inside the frame while a light is open, and what floats over it. */

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { serialisedSize } from '../domain/patchDocument';
import { drawable, type Ready } from '../domain/connection';
import type { Patch } from '../domain/patch';
import type { MasterColour } from '../domain/masterColour';
import type { AudioFeed } from '../domain/scope';
import type { DeviceInfo, Heartbeat } from '../device/wire';
import { Boundary } from '../ui/Boundary';
import { PatchRail, type Chosen } from '../ui/PatchRail';
import type { Preset } from '../library/presets';
import { SurfaceMenu, UserSurface } from '../ui/Surface';
import { ControlEditor } from '../ui/controlEditor';
import { BUDGET } from '../domain/catalog';
import { Budget, Blurb, Hr, Ico, Lab, ModIcon, Vr } from '../ui/bits';
import { Inspector, SideColumn } from '../ui/inspector';
import { LayerPanel } from '../ui/LayerStack';
import { MacroRack } from '../ui/Macros';
import { ModDock } from '../ui/dock';
import { MatrixSheet } from '../ui/matrixSheet';
import { SheetHead } from '../ui/Sheet';
import { FragmentSheet } from '../ui/Fragments';
import { PaletteSheet } from '../ui/Palettes';
import { Randomise } from '../ui/Randomise';
import { EmitterPanel, MasterPanel } from '../ui/SignalChain';
import { Strip } from '../ui/Strip';
import type { Ctl, Reached } from '../ui/ctl';
import type { BindGesture } from './useBindGesture';
import type { Dialogs } from './useDialogs';
import type { Navigation } from './useNavigation';
import type { PatchDraft } from './usePatchDraft';
import type { Rolls } from './useRolls';
import { sectionOfSide, type EditorSection } from './useSection';

/** How full a look gets before the size meter shows. */
const NEAR_FULL = 0.8;

/** The name, the notes and every shelf: saving a look and loading one are the same sheet. */
export function SaveSheet({
  draft, chosen, onChoose, onLoad, onSend, say, saveNudge, onClose,
}: {
  draft: Pick<
    PatchDraft,
    'patch' | 'patchName' | 'patchNotes' | 'patchNameRef' | 'setPatchName' | 'setPatchNotes'
  >;
  chosen: Chosen | null;
  onChoose(chosen: Chosen | null): void;
  onLoad(preset: Preset, from: string): void;
  onSend(preset: Preset, name: string): void;
  say(message: string): void;
  saveNudge: number;
  onClose(): void;
}) {
  const { patch, patchName, patchNotes, patchNameRef, setPatchName, setPatchNotes } = draft;
  // Not `Overlay`: that holds the frame loop, and a row's strip here has to move.
  return (
    <div className="editor-overlay" onClick={onClose}>
      <div className="editor-sheet savesheet" onClick={e => e.stopPropagation()}>
        <SheetHead icon={<Ico.Rail c="var(--text-3)" />} title="SAVE OR LOAD" onClose={onClose}>
          {null}
        </SheetHead>
        <PatchRail
          chosen={chosen?.key ?? null}
          onChoose={onChoose}
          onLoad={onLoad}
          onSend={onSend}
          save={{
            patch,
            name: patchName,
            notes: patchNotes,
            onName: (n: string) => {
              patchNameRef.current = n;
              setPatchName(n);
            },
            onNotes: setPatchNotes,
          }}
          say={say}
          saveNudge={saveNudge}
        />
      </div>
    </div>
  );
}

/** Connected, but the vocabulary has not arrived. */
export function AwaitingCatalog({ ready, label, notice, onBack }: {
  ready: Ready;
  label: string;
  /** Where the socket has got to, when that is the reason for waiting. */
  notice?: string;
  onBack(): void;
}) {
  return (
    <div className="await-catalog">
      {ready.at === 'unusable' ? (
        <div className="catalog-fail">
          <Lab className="head">{label || 'This device'} cannot be edited</Lab>
          <p>{ready.why}</p>
          <button className="pill raise" onClick={onBack}>Back</button>
        </div>
      ) : (notice ?? 'Reading what this device can build…')}
    </div>
  );
}

function CentrePanel({ ctl, nav }: { ctl: Ctl; nav: Navigation }) {
  const { scope, layer, tab, setTab } = nav;
  if (scope === 'master') return <MasterPanel ctl={ctl} tab={tab} onTab={setTab} />;
  if (layer) return <EmitterPanel ctl={ctl} layer={layer} tab={tab} onTab={setTab} />;
  return (
    <div className="centre" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ font: '400 12px/1.7 var(--sans)', color: 'var(--text-5)' }}>
        No layer selected. Add one on the left.
      </span>
    </div>
  );
}

function SidePanel({ ctl, nav, patch, rolled, dialogs, connected, deviceName, onSave }: {
  ctl: Ctl;
  nav: Navigation;
  patch: Patch;
  rolled: Rolls;
  dialogs: Dialogs;
  connected: boolean;
  deviceName: string;
  onSave(): void;
}) {
  const { side, scope, layer, host } = nav;
  if (side === 'randomise') {
    return (
      <Randomise
        patch={patch}
        history={rolled.rolls}
        opts={rolled.rollOpts}
        onOpts={rolled.setRollOpts}
        habits={rolled.habits === 'off' ? 'off' : rolled.habits !== null}
        connected={connected}
        deviceName={deviceName}
        onRoll={rolled.rollApply}
        onStep={rolled.rollStep}
        onSave={onSave}
      />
    );
  }
  if (side === 'user') {
    return (
      <UserSurface
        ctl={ctl}
        onEdit={(control, x, y) => dialogs.setEditingControl({ control, isNew: false, x, y })}
      />
    );
  }
  if (host) {
    return (
      <Inspector ctl={ctl} layer={scope === 'master' ? null : layer ?? null} host={host}
                 onBrowsePalettes={() => dialogs.setShowPalettes(true)} />
    );
  }
  return (
    <>
      <div className="panelhead"><Lab className="head">{side === 'fx' ? 'FX' : 'Colour'}</Lab></div>
      <Hr />
      <div style={{ padding: '18px 16px' }}>
        <Blurb>No layer selected. Add one on the left, or roll a patch on the Randomise tab.</Blurb>
      </div>
    </>
  );
}

function PaletteSheets({ ctl, nav, master, onRecallMaster, onClose }: {
  ctl: Ctl;
  nav: Navigation;
  master: MasterColour | null;
  onRecallMaster(entries: string[]): Reached;
  onClose(): void;
}) {
  const { scope, layer } = nav;
  {/*
    * Recall replaces the ENTRIES on the selected layer and nothing else — the palette
    * transforms beside them are modulation targets, and resetting those would undo a rack
    * the user tuned. `structural` because an entries array has no addressable path.
    *
    * Keyed on the slot so the sheet cannot outlive the layer it was opened for: selecting
    * a different layer while it is open remounts it against the new palette.
    */}
  if (scope === 'master' && master) {
    return (
      <PaletteSheet
        key="master"
        ctl={ctl}
        where="master"
        entries={master.entries}
        wrap={false}
        onRecall={(entries, name) => {
          const reached = onRecallMaster(entries);
          ctl.say(
            reached ? `${name} recalled onto every layer` : `${name} recalled — not connected`,
          );
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  {/* On the layer scope only: from MASTER, `layer` is still the one last selected, and its
      sheet is not the one MASTER's palette button means. */}
  if (scope === 'layer' && layer) {
    return (
      <PaletteSheet
        key={layer.slot}
        ctl={ctl}
        where="layer"
        entries={layer.colour.palette.entries}
        wrap={layer.colour.wrap}
        onRecall={(entries, name) => {
          const reached = ctl.structural(d => {
            const L = d.layers.find(x => x.slot === layer.slot);
            if (L) L.colour.palette.entries = entries.slice();
          });
          ctl.say(
            reached ? `${name} recalled onto L${layer.slot}` : `${name} recalled — not connected`,
          );
          onClose();
        }}
        onClose={onClose}
      />
    );
  }
  return null;
}

/** How much room is left, once there is little of it. */
function SizeMeter({ patch }: { patch: Patch }) {
  const bytes = useMemo(() => serialisedSize(patch), [patch]);
  return bytes > BUDGET.NVS * NEAR_FULL ? <Budget bytes={bytes} w={120} /> : null;
}

/** One part of the editor. Stays mounted while another section shows, so nothing is lost. */
function Part({ id, section, children }: {
  id: EditorSection;
  section: EditorSection;
  children: ReactNode;
}) {
  return <div className="sectionpart" data-section={id} data-open={section === id}>{children}</div>;
}

export function EditorStage({
  ctl, nav, rolled, dialogs, patch, master, audio, onRecallMaster,
  section, info, hb, label, onLeave, onSave,
}: {
  ctl: Ctl;
  nav: Navigation;
  rolled: Rolls;
  dialogs: Dialogs;
  patch: Patch;
  master: MasterColour | null;
  audio: AudioFeed;
  onRecallMaster(entries: string[]): Reached;
  section: EditorSection;
  info: DeviceInfo | null;
  hb: Heartbeat | null;
  label: string;
  onLeave(): void;
  onSave(): void;
}) {
  const deviceName = hb?.device_name ?? label;
  const scroller = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [section]);
  return (
    <>
      {/* Outside the boundary: it draws from the engine, not the catalog, so a light the
          editor cannot render controls for can still be watched. */}
      <Strip deviceCatalogHash={info?.catalog_hash} meter={<SizeMeter patch={patch} />} />

      {/*
       * Every control down here is built from the node catalog the light published, so a light
       * one build behind can throw during render — which unmounts the whole tree and leaves a
       * white page. The app's own Edit header stays outside it, so Back still works.
       *
       * Keyed on the light, so arriving at a different one clears a verdict about the
       * last. See LIFE-702.
       */}
      <div className="editscroll" ref={scroller}>
      <Boundary
        key={info?.device_id ?? label}
        label={deviceName}
        firmware={hb?.firmware_version ?? info?.firmware_version}
        onLeave={onLeave}
      >
        <div className="body">
          <Part id="layers" section={section}>
            <LayerPanel ctl={ctl} onFragments={() => dialogs.setShowFragments(true)} />
            <Vr />
            <CentrePanel ctl={ctl} nav={nav} />
            <Vr />
          </Part>
          <Part id={sectionOfSide(nav.side)} section={section}>
            <SideColumn side={nav.side} onSide={nav.setSide}>
              <SidePanel
                ctl={ctl}
                nav={nav}
                patch={patch}
                rolled={rolled}
                dialogs={dialogs}
                connected
                deviceName={deviceName}
                onSave={onSave}
              />
            </SideColumn>
          </Part>
        </div>

        {/*
         * Above the modulators and not behind a sheet, because a macro is played rather than
         * configured — the whole point of the rack is reaching for it while watching the
         * strip.
         *
         * It renders even with no macros on it, which it did not before there was any way to
         * author one: an empty shelf used to be a control that did nothing, and is now the
         * only place the `+` can live. It is no longer what the phone draws: a knob reaches
         * the phone by being exposed from its dial, and the User tab on the right is the
         * phone's view of the patch (LIFE-867).
         */}
        <Part id="motion" section={section}>
          <MacroRack ctl={ctl} />

          <ModDock
            ctl={ctl}
            editing={nav.editingMod}
            onEdit={nav.setEditingMod}
            onOpenMatrix={() => dialogs.setShowMatrix(true)}
            audio={audio}
          />
        </Part>

        {dialogs.showMatrix && (
          <MatrixSheet ctl={ctl} onClose={() => dialogs.setShowMatrix(false)} />
        )}

        {dialogs.showFragments && (
          <FragmentSheet ctl={ctl} onClose={() => dialogs.setShowFragments(false)} />
        )}

        {dialogs.showPalettes && (
          <PaletteSheets
            ctl={ctl}
            nav={nav}
            master={master}
            onRecallMaster={onRecallMaster}
            onClose={() => dialogs.setShowPalettes(false)}
          />
        )}
      </Boundary>
      </div>
    </>
  );
}

function DragGhost({ gesture, patch }: { gesture: BindGesture; patch: Patch }) {
  const { drag, ghost, hot } = gesture;
  const draggingMod =
    drag?.kind === 'mod' ? patch.modulators.find(m => m.slot === drag.slot) : undefined;
  if (!ghost || !draggingMod) return null;
  return (
    <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }}>
      <div className="modslot raise-hi" data-dragging="true" style={{ width: 170 }}>
        <div className="row" style={{ gap: 9 }}>
          <span style={{ font: '400 11px/1 var(--mono)', color: 'var(--modulation-soft)' }}>
            {draggingMod.slot}
          </span>
          <ModIcon type={draggingMod.type} />
          <span className="mname">{draggingMod.type}</span>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <div className="meter well">
            <i style={{ width: '50%' }} />
          </div>
          <span className="detail">{hot ?? 'drop on a parameter'}</span>
        </div>
      </div>
    </div>
  );
}

/** What floats over the editor, outside the frame. */
export function EditorOverlays({ ctl, gesture, dialogs, patch, toast, ready }: {
  ctl: Ctl;
  gesture: BindGesture;
  dialogs: Dialogs;
  patch: Patch;
  toast: string | null;
  ready: Ready;
}) {
  const { exposeAt, setExposeAt, editingControl, setEditingControl } = dialogs;
  return (
    <>
      <DragGhost gesture={gesture} patch={patch} />

      {exposeAt && drawable(ready) && (
        <SurfaceMenu
          ctl={ctl}
          at={exposeAt}
          onClose={() => setExposeAt(null)}
          onEdit={(control, isNew) => {
            setEditingControl({ control, isNew, x: exposeAt.x, y: exposeAt.y });
            setExposeAt(null);
          }}
        />
      )}
      {/* Keyed on the control, so opening a second one while one is open starts from its own
          values. */}
      {editingControl && drawable(ready) && (
        <ControlEditor
          key={`${editingControl.control.key}:${editingControl.isNew}`}
          ctl={ctl}
          at={editingControl}
          control={editingControl.control}
          isNew={editingControl.isNew}
          onClose={() => setEditingControl(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
