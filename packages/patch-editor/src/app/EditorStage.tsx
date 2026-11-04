/** What stands inside the frame while a light is open, and what floats over it. */

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sheet, SheetBody, Toast } from '../../../../src/composites';
import { Presence, TextKey } from '../../../../src/design-system';
import { serialisedSize } from '../domain/patchDocument';
import { drawable, type Ready } from '../domain/connection';
import type { Patch } from '../domain/patch';
import type { MasterColour } from '../domain/masterColour';
import type { AudioFeed } from '../domain/scope';
import type { DeviceInfo, Heartbeat } from '../device/wire';
import { Boundary } from '../ui/Boundary';
import { SurfaceMenu, UserSurface } from '../ui/Surface';
import { ControlEditor } from '../ui/controlEditor';
import { BUDGET } from '../domain/catalog';
import { Budget, Blurb, Hr, Lab, ModIcon, Mono, Vr, layerName, slotNumber } from '../ui/bits';
import { Inspector, SideColumn } from '../ui/inspector';
import { LayerPanel } from '../ui/LayerStack';
import { MacroRack } from '../ui/Macros';
import { ModDock } from '../ui/dock';
import { MatrixSheet } from '../ui/matrixSheet';
import { FragmentSheet } from '../ui/Fragments';
import { PaletteSheet } from '../ui/Palettes';
import { Randomise } from '../ui/Randomise';
import { SavePanel } from '../ui/SavePanel';
import { EmitterPanel, MasterPanel } from '../ui/SignalChain';
import { Strip } from '../ui/Strip';
import type { Ctl, Reached } from '../ui/ctl';
import type { BindGesture } from './useBindGesture';
import type { Dialogs } from './useDialogs';
import type { History } from './useHistory';
import type { Navigation } from './useNavigation';
import type { PatchDraft } from './usePatchDraft';
import type { Rolls } from './useRolls';
import type { Toast as ToastLine } from './useToast';
import { sectionOfSide, type EditorSection } from './useSection';
import { Pill } from '../ui/controls';

/** How full a look gets before the size meter shows. */
const NEAR_FULL = 0.8;

/** The name, the notes and publishing. Choosing a look is the Looks page. */
export function SaveSheet({ draft, say, saveNudge, onClose }: {
  draft: Pick<
    PatchDraft,
    | 'patch' | 'patchName' | 'patchNotes' | 'patchNameRef' | 'markSaved'
    | 'setPatchName' | 'setPatchNotes'
  >;
  say(message: string): void;
  saveNudge: number;
  onClose(): void;
}) {
  const { patch, patchName, patchNotes, patchNameRef, markSaved } = draft;
  const { setPatchName, setPatchNotes } = draft;
  return (
    <Sheet label="Save" actions={<TextKey onClick={onClose}>DONE</TextKey>} onClose={onClose}>
      <SheetBody>
        <SavePanel
          save={{
            patch,
            name: patchName,
            notes: patchNotes,
            onName: (n: string) => {
              patchNameRef.current = n;
              setPatchName(n);
            },
            onNotes: setPatchNotes,
            onSaved: markSaved,
          }}
          say={say}
          saveNudge={saveNudge}
        />
      </SheetBody>
    </Sheet>
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
          <Pill className="raise" onClick={onBack}>Back</Pill>
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
      <span style={{ font: 'var(--type-note)', color: 'var(--text-4)' }}>
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
        onAdd={() => {
          dialogs.setPicking(true);
          ctl.say('Now tap the knob, switch, blend or colours it should move');
        }}
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
      <div className="panelhead"><Lab className="head">{side === 'fx' ? 'Effects' : 'Colour'}</Lab></div>
      <Hr />
      <div style={{ padding: 'var(--space-4)' }}>
        <Blurb>No layer selected. Add one on the left, or roll one on the Roll tab.</Blurb>
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
            reached ? `${name} on every layer` : `${name} on every layer — not connected`,
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
            reached
              ? `${name} on ${layerName(layer.slot)}`
              : `${name} on ${layerName(layer.slot)} — not connected`,
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

/** Said on every section: which light the edit is live on, and the way back from a change. */
function StripHead({ deviceName, history }: { deviceName: string; history: History }) {
  return (
    <>
      <Mono className="dim sm">live on {deviceName}</Mono>
      <span className="grow" />
      <Pill disabled={!history.canUndo} onClick={history.undo} aria-keyshortcuts="Control+Z">
        UNDO
      </Pill>
      <Pill disabled={!history.canRedo} onClick={history.redo} aria-keyshortcuts="Control+Shift+Z">
        REDO
      </Pill>
    </>
  );
}

/** One part of the editor. Stays mounted while another section shows, so nothing is lost. */
function Part({ id, section, children }: {
  id: EditorSection;
  section: EditorSection;
  children: ReactNode;
}) {
  return <div className="sectionpart" data-section={id} data-open={section === id}>{children}</div>;
}

/** The sheets the editor opens over itself: the matrix, the fragments and the palettes. */
function EditorSheets({ ctl, nav, dialogs, master, onRecallMaster }: {
  ctl: Ctl;
  nav: Navigation;
  dialogs: Dialogs;
  master: MasterColour | null;
  onRecallMaster(entries: string[]): Reached;
}) {
  return (
    <>
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
    </>
  );
}

export function EditorStage({
  ctl, nav, rolled, dialogs, patch, master, audio, onRecallMaster,
  section, info, hb, label, history, onLeave, onSave,
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
  history: History;
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
      <Strip
        deviceCatalogHash={info?.catalog_hash}
        meter={<SizeMeter patch={patch} />}
        head={<StripHead deviceName={deviceName} history={history} />}
      />

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

        <EditorSheets ctl={ctl} nav={nav} dialogs={dialogs} master={master}
                      onRecallMaster={onRecallMaster} />
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
      <div className="modslot raise-hi" data-dragging="true" style={{ width: 'var(--edit-tile-width)' }}>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <span style={{ font: 'var(--type-small)', color: 'var(--modulation-soft)' }}>
            {slotNumber(draggingMod.slot)}
          </span>
          <ModIcon type={draggingMod.type} />
          <span className="mname">{draggingMod.type}</span>
        </div>
        <div className="col" style={{ gap: 'var(--space-2)' }}>
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
export function EditorOverlays({ ctl, gesture, dialogs, patch, toast, ready, onUndo }: {
  ctl: Ctl;
  gesture: BindGesture;
  dialogs: Dialogs;
  patch: Patch;
  toast: ToastLine | null;
  ready: Ready;
  onUndo(): void;
}) {
  const { exposeAt, setExposeAt, editingControl, setEditingControl } = dialogs;
  return (
    <>
      <DragGhost gesture={gesture} patch={patch} />

      {/* Each popover sits in a `Presence`, so it stays for its leaving motion after it closes (TR-4). */}
      <Presence>
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
      </Presence>
      {/* Keyed on the control, so opening a second one while one is open starts from its own
          values. */}
      <Presence>
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
      </Presence>

      <Presence>
      {toast && (
        <Toast text={toast.text} isOverDock>
          {toast.canUndo && <TextKey onClick={onUndo}>UNDO</TextKey>}
        </Toast>
      )}
      </Presence>
    </>
  );
}
