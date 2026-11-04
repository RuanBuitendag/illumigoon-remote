import type { EditorSection } from '@illumigoon/patch-editor';
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react';
import { EditLayout } from '../../composites';
import { APP_IDENTITY } from '../light-network/app-identity';
import type { AnimationState } from '../light-network/protocol';
import { finishEdit, holdForEdit } from '../store/edit-follow';
import { isDraft, keepDraft, leaveDraft } from '../store/drafts';
import { editorApi } from '../store/editor-host';
import { noteState, useFleet, type Light } from '../store/fleet-store';
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

type EditScope = {
  light: EditorLight;
  room: Room;
  scope: string[];
  before: ReturnType<typeof momentsOf>;
  draft: string | undefined;
};

type Left = { name: string; look: AnimationState; isSaved: boolean };

// What the bar says after Edit. A draft keeps itself, so it has nothing to save.
function offerAfter({ before, draft }: EditScope, { name, look, isSaved }: Left) {
  if (draft === name) return { text: `${name} is in Mine`, moments: before };
  const unsaved = isSaved ? undefined : { name, animation: look };
  return { text: 'Changes are on the light', moments: before, unsaved };
}

// The others in scope take the look, and UNDO stays until the person saves, undoes or changes more.
function leaveEdit(edit: EditScope, left: Left) {
  const { light, room, scope, draft } = edit;
  if (draft) void leaveDraft(draft, left.name, left.look);
  offerUndo(offerAfter(edit, left));
  pauseUndo();
  finishEdit(light.address, lightsInScope(room, scope), left.name, left.look);
}

// A draft takes each change as it rests (LIFE-1966).
const keeperOf = (draft: string | undefined, lookName: string) =>
  draft ? (look: AnimationState) => void keepDraft(draft, lookName, look) : undefined;

// Lights that are off sit an edit out, so nothing has to go back on them.
const litLights = (room: Room | undefined, chosenAddresses: string[]) =>
  room ? lightsInScope(room, chosenAddresses).filter(({ isOnline, isOn }) => isOnline && isOn) : [];

const isOneLightIn = (room: Room | undefined, chosenAddresses: string[]) =>
  room !== undefined && lightsInScope(room, chosenAddresses).length === 1;

// Chosen once: the editor stays on this light whatever the fleet does while it is open.
function editStart(room: Room | undefined, chosenAddresses: string[]) {
  const playing = litLights(room, chosenAddresses);
  const light = firstLight(room, chosenAddresses);
  return {
    light,
    draft: isDraft(light?.lookName) ? light?.lookName : undefined,
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
  onChange: ((look: AnimationState) => void) | undefined;
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
  const [{ light, draft, scope, playing, before, isOneLight }] = useState(() => editStart(room, chosenAddresses));
  const backLabel = useBackLabel(room);
  const [lookName, setLookName] = useState(light?.lookName ?? '');
  const [section, setSection] = useState<EditorSection>('layers');
  const [isSaving, setSaving] = useState(false);
  const [hasLeft, setLeft] = useState(false);
  const { dialogs, sheet } = useEditorDialogs();
  useEditorHold(hasLeft ? undefined : light?.address, isOpen);

  const leave = (look: AnimationState | null, isSaved: boolean) => {
    setLeft(true);
    if (light && look && room) leaveEdit({ light, room, scope, before, draft }, { name: lookName, look, isSaved });
  };
  const keep = keeperOf(draft, lookName);

  if (hasLeft || (!light && !isOpen)) return null;
  const frame = { backLabel, isOneLight, lookName, room, playing, section, onSection: setSection, onSave: () => setSaving(true) };
  return (
    <EditFrame {...frame} lightName={light?.name} onBack={closePage} sheet={sheet}>
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
          onChange={keep}
          onLeave={leave}
        />
      )}
    </EditFrame>
  );
}
