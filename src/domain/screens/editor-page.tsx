import type { EditorSection } from '@illumigoon/patch-editor';
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react';
import { EditLayout } from '../../composites';
import { APP_IDENTITY } from '../light-network/app-identity';
import type { AnimationState } from '../light-network/protocol';
import { finishEdit, holdForEdit } from '../store/edit-follow';
import { editorApi } from '../store/editor-host';
import { noteState, useFleet, type Light } from '../store/fleet-store';
import { loadLibrary } from '../store/library-store';
import { closePage, useBackLabel, useNavigation } from '../store/navigation-store';
import { lightsInScope, lookNameOf, type Room } from '../store/rooms';
import { guardBack } from '../store/screen-history';
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

function firstLight(room: Room | undefined, chosenAddresses: string[]) {
  if (!room) return undefined;
  // A look written to a light that is off can replace the one it has saved.
  const light = lightsInScope(room, chosenAddresses).find(({ isOnline, isOn }) => isOnline && isOn);
  if (!light) return undefined;
  const { address, name } = light;
  return { url: `ws://${address}/ws`, address, name, lookName: lookNameOf(light) ?? undefined };
}

function titleOf(lookName: string, lightName: string | undefined, isOneLight: boolean) {
  return isOneLight ? `${lookName} on ${lightName}` : lookName;
}

// Edit plays on one light, and the others in scope take the look when the person leaves.
function whereOf(lightName: string | undefined, room: Room | undefined, lights: Light[], isOneLight: boolean) {
  if (isOneLight || !lightName || !room) return undefined;
  if (lights.length < 2) return `On ${lightName}`;
  return `On ${lightName}, then all ${lights.length} ${room.name} lights when you leave`;
}

// What the editor opened on is what the light plays, so the strips in the app draw the same look.
function noteOpened(address: string, lookName: string, look: AnimationState) {
  const light = useFleet.getState().lights[address];
  if (light) noteState(light, { isOn: true, lookName: lookName || undefined, animation: look });
}

type EditScope = { light: EditorLight; room: Room; scope: string[]; before: ReturnType<typeof momentsOf> };

// The others in scope take the look, and UNDO stays until the person saves, undoes or changes more.
function leaveEdit({ light, room, scope, before }: EditScope, { name, look, isSaved }: { name: string; look: AnimationState; isSaved: boolean }) {
  const unsaved = isSaved ? undefined : { name, animation: look };
  offerUndo({ text: 'Changes are on the light', moments: before, unsaved });
  pauseUndo();
  finishEdit(light.address, lightsInScope(room, scope), name, look);
}

async function askToLeave(isUnsaved: boolean, lookName: string, dialogs: ReturnType<typeof useEditorDialogs>['dialogs']) {
  const name = lookName.trim() || 'this look';
  if (isUnsaved && !(await dialogs.ask(`Leave without saving ${name}? The lights keep playing it.`))) return;
  closePage();
}

// Lights that are off sit an edit out, so nothing has to go back on them.
const litLights = (room: Room | undefined, chosenAddresses: string[]) =>
  room ? lightsInScope(room, chosenAddresses).filter(({ isOnline, isOn }) => isOnline && isOn) : [];

const isOneLightIn = (room: Room | undefined, chosenAddresses: string[]) =>
  room !== undefined && lightsInScope(room, chosenAddresses).length === 1;

// Chosen once: the editor stays on this light whatever the fleet does while it is open.
function editStart(room: Room | undefined, chosenAddresses: string[]) {
  const playing = litLights(room, chosenAddresses);
  return {
    light: firstLight(room, chosenAddresses),
    scope: chosenAddresses,
    playing,
    before: momentsOf(playing),
    isOneLight: isOneLightIn(room, chosenAddresses),
  };
}

// While Edit is open its own socket holds the light, and after it the home screen reads the
// scenes and palettes again, because the editor can change them.
function useEditorHold(heldAddress: string | undefined, isOpen: boolean) {
  useEffect(() => {
    if (!heldAddress) return undefined;
    holdForEdit(heldAddress, true);
    return () => holdForEdit(heldAddress, false);
  }, [heldAddress]);

  useEffect(() => {
    if (!isOpen) void loadLibrary();
  }, [isOpen]);
}

type EditorLight = NonNullable<ReturnType<typeof firstLight>>;

type EditorPaneProps = {
  light: EditorLight;
  isOpen: boolean;
  section: EditorSection;
  isSaving: boolean;
  dialogs: ReturnType<typeof useEditorDialogs>['dialogs'];
  onSaving: (isSaving: boolean) => void;
  onSection: (section: EditorSection) => void;
  onName: (name: string) => void;
  onUnsaved: (isUnsaved: boolean) => void;
  onLeave: (look: AnimationState | null, isSaved: boolean) => void;
};

function EditorPane({ light, onSaving, ...props }: EditorPaneProps) {
  return (
    <Suspense>
      <PatchEditor
        {...props}
        light={light}
        api={editorApi}
        identity={APP_IDENTITY}
        onSaveOpen={() => onSaving(true)}
        onSaveClosed={() => onSaving(false)}
        onOpened={(look) => noteOpened(light.address, light.lookName ?? '', look)}
        onClose={closePage}
      />
    </Suspense>
  );
}

type EditFrameProps = {
  backLabel: string;
  isOneLight: boolean;
  lookName: string;
  lightName: string | undefined;
  room: Room | undefined;
  playing: Light[];
  section: EditorSection;
  sheet: ReactNode;
  children: ReactNode;
  onSection: (section: EditorSection) => void;
  onSave: () => void;
  onBack: () => void;
};

// The page around the editor. With no light on there is nothing to save.
function EditFrame({ lookName, lightName, isOneLight, room, playing, sheet, children, onSave, ...frame }: EditFrameProps) {
  return (
    <EditLayout
      {...frame}
      title={titleOf(lookName, lightName, isOneLight)}
      where={whereOf(lightName, room, playing, isOneLight)}
      sections={SECTIONS}
      onSave={lightName ? onSave : undefined}
    >
      {children}
      {sheet}
    </EditLayout>
  );
}

export function EditorPage({ room }: { room: Room | undefined }) {
  const isOpen = useNavigation((navigation) => navigation.isPageOpen);
  const chosenAddresses = useNavigation((navigation) => navigation.chosenAddresses);
  const [{ light, scope, playing, before, isOneLight }] = useState(() => editStart(room, chosenAddresses));
  const backLabel = useBackLabel(room);
  const [lookName, setLookName] = useState(light?.lookName ?? '');
  const [section, setSection] = useState<EditorSection>('layers');
  const [isSaving, setSaving] = useState(false);
  const [hasLeft, setLeft] = useState(false);
  const { dialogs, sheet } = useEditorDialogs();
  const [isUnsaved, setUnsaved] = useState(false);
  useEditorHold(hasLeft ? undefined : light?.address, isOpen);

  const leave = (look: AnimationState | null, isSaved: boolean) => {
    setLeft(true);
    if (light && look && room) leaveEdit({ light, room, scope, before }, { name: lookName, look, isSaved });
  };

  // The lights keep an unsaved look, but nothing else does, so a person is asked before it goes. The system
  // Back gesture asks the same.
  const back = () => void askToLeave(isUnsaved, lookName, dialogs);
  useEffect(() => {
    if (!isOpen) return undefined;
    return guardBack(() => void askToLeave(isUnsaved, lookName, dialogs));
  }, [isOpen, isUnsaved, lookName, dialogs]);

  if (hasLeft || (!light && !isOpen)) return null;
  const frame = { backLabel, isOneLight, lookName, room, playing, section, onSection: setSection, onSave: () => setSaving(true) };
  return (
    <EditFrame {...frame} lightName={light?.name} onBack={back} sheet={sheet}>
      {light && (
        <EditorPane
          light={light}
          isOpen={isOpen}
          section={section}
          isSaving={isSaving}
          dialogs={dialogs}
          onSaving={setSaving}
          onSection={setSection}
          onName={setLookName}
          onUnsaved={setUnsaved}
          onLeave={leave}
        />
      )}
    </EditFrame>
  );
}
