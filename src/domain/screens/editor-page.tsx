import type { EditorSection } from '@illumigoon/patch-editor';
import { lazy, Suspense, useEffect, useState } from 'react';
import { EditLayout } from '../../composites';
import { APP_IDENTITY } from '../light-network/app-identity';
import type { AnimationState } from '../light-network/protocol';
import { finishEdit } from '../store/edit-follow';
import { editorApi } from '../store/editor-host';
import { noteState, setHeldByEditor, useFleet, type Light } from '../store/fleet-store';
import { loadLibrary } from '../store/library-store';
import { closePage, useBackLabel, useNavigation } from '../store/navigation-store';
import { lightsInScope, lookNameOf, type Room } from '../store/rooms';
import { momentsOf, offerUndo, pauseUndo } from '../store/undo';
import { useEditorDialogs } from './editor-dialogs';

// The editor is large, so a phone that only sets looks never loads it.
const PatchEditor = lazy(async () => ({ default: (await import('@illumigoon/patch-editor')).PatchEditor }));

const SECTIONS: { value: EditorSection; name: string }[] = [
  { value: 'layers', name: 'LAYERS' },
  { value: 'colour', name: 'COLOUR' },
  { value: 'motion', name: 'MOTION' },
  { value: 'controls', name: 'CONTROLS' },
  { value: 'roll', name: 'ROLL' },
];

function firstLight(room: Room | undefined, scopeAddress: string | null) {
  if (!room) return undefined;
  // A look written to a light that is off can replace the one it has saved.
  const light = lightsInScope(room, scopeAddress).find(({ isOnline, isOn }) => isOnline && isOn);
  if (!light) return undefined;
  const { address, name } = light;
  return { url: `ws://${address}/ws`, address, name, lookName: lookNameOf(light) ?? undefined };
}

function titleOf(lookName: string, lightName: string | undefined, isOneLight: boolean) {
  return isOneLight ? `${lookName} on ${lightName}` : lookName;
}

// Edit plays on one light, and the others in scope take the look when the person leaves.
function whereOf(lightName: string | undefined, room: Room | undefined, lights: Light[]) {
  if (!lightName || !room) return undefined;
  if (lights.length < 2) return `On ${lightName}`;
  return `On ${lightName}, then all ${lights.length} ${room.name} lights when you leave`;
}

// What the editor opened on is what the light plays, so the strips in the app draw the same look.
function noteOpened(address: string, lookName: string, look: AnimationState) {
  const light = useFleet.getState().lights[address];
  if (light) noteState(light, { isOn: true, lookName: lookName || undefined, animation: look });
}

export function EditorPage({ room }: { room: Room | undefined }) {
  const isOpen = useNavigation((navigation) => navigation.isPageOpen);
  const scopeAddress = useNavigation((navigation) => navigation.scopeAddress);
  // Chosen once: the editor stays on this light whatever the fleet does while it is open.
  const [light] = useState(() => firstLight(room, scopeAddress));
  const [scope] = useState(scopeAddress);
  // Lights that are off sit an edit out, so nothing has to go back on them.
  const [playing] = useState(() =>
    room ? lightsInScope(room, scopeAddress).filter(({ isOnline, isOn }) => isOnline && isOn) : [],
  );
  const [before] = useState(() => momentsOf(playing));
  const [isOneLight] = useState(() => room !== undefined && lightsInScope(room, scopeAddress).length === 1);
  const backLabel = useBackLabel(room);
  const [lookName, setLookName] = useState(light?.lookName ?? '');
  const [section, setSection] = useState<EditorSection>('layers');
  const [isSaving, setSaving] = useState(false);
  const [hasLeft, setLeft] = useState(false);
  const { dialogs, sheet } = useEditorDialogs();
  const heldAddress = hasLeft ? undefined : light?.address;

  useEffect(() => {
    if (!heldAddress) return undefined;
    setHeldByEditor(heldAddress, true);
    return () => setHeldByEditor(heldAddress, false);
  }, [heldAddress]);

  // The editor can change scenes and palettes, so the home screen reads them again after it.
  useEffect(() => {
    if (!isOpen) void loadLibrary();
  }, [isOpen]);

  const leave = (look: AnimationState | null, isSaved: boolean) => {
    setLeft(true);
    if (!light || !look || !room) return;
    const unsaved = isSaved ? undefined : { name: lookName, animation: look };
    offerUndo({ text: 'Changes are on the light', moments: before, unsaved });
    // Stays until the person saves, undoes or makes another change.
    pauseUndo();
    finishEdit(light.address, lightsInScope(room, scope), lookName, look);
  };

  if (hasLeft || (!light && !isOpen)) return null;
  return (
    <EditLayout
      backLabel={backLabel}
      title={titleOf(lookName, light?.name, isOneLight)}
      where={isOneLight ? undefined : whereOf(light?.name, room, playing)}
      sections={SECTIONS}
      section={section}
      onSection={setSection}
      onBack={closePage}
      onSave={light && (() => setSaving(true))}
    >
      {light && (
        <Suspense>
          <PatchEditor
            light={light}
            api={editorApi}
            identity={APP_IDENTITY}
            dialogs={dialogs}
            isOpen={isOpen}
            section={section}
            isSaving={isSaving}
            onSaveOpen={() => setSaving(true)}
            onSaveClosed={() => setSaving(false)}
            onSection={setSection}
            onName={setLookName}
            onOpened={(look) => noteOpened(light.address, light.lookName ?? '', look)}
            onLeave={leave}
            onClose={closePage}
          />
        </Suspense>
      )}
      {sheet}
    </EditLayout>
  );
}
