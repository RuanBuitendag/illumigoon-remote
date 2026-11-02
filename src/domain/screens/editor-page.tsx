import type { EditorSection } from '@illumigoon/patch-editor';
import { lazy, Suspense, useEffect, useState } from 'react';
import { EditLayout } from '../../composites';
import { APP_IDENTITY } from '../light-network/app-identity';
import type { AnimationState } from '../light-network/protocol';
import { finishEdit } from '../store/edit-follow';
import { editorApi } from '../store/editor-host';
import { setHeldByEditor } from '../store/fleet-store';
import { loadLibrary } from '../store/library-store';
import { closePage, useNavigation } from '../store/navigation-store';
import { lightsInScope, lookNameOf, type Room } from '../store/rooms';
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

export function EditorPage({ room }: { room: Room | undefined }) {
  const isOpen = useNavigation((navigation) => navigation.isPageOpen);
  const scopeAddress = useNavigation((navigation) => navigation.scopeAddress);
  // Chosen once: the editor stays on this light whatever the fleet does while it is open.
  const [light] = useState(() => firstLight(room, scopeAddress));
  const [scope] = useState(scopeAddress);
  const [isOneLight] = useState(() => room !== undefined && lightsInScope(room, scopeAddress).length === 1);
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

  const leave = (look: AnimationState | null) => {
    setLeft(true);
    if (light && look && room) finishEdit(light.address, lightsInScope(room, scope), lookName, look);
  };

  if (hasLeft || (!light && !isOpen)) return null;
  return (
    <EditLayout
      backLabel={room?.name ?? 'Rooms'}
      title={titleOf(lookName, light?.name, isOneLight)}
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
            onLeave={leave}
            onClose={closePage}
          />
        </Suspense>
      )}
      {sheet}
    </EditLayout>
  );
}
