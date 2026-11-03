import { useEffect, useRef, useState } from 'react';
import {
  LookElsewhere,
  LookGroup,
  LookItem,
  LookList,
  LookPreset,
  LookProblem,
  LookSearch,
} from '../../composites';
import { ActionKey, FileKey, KeyRow, TextKey } from '../../design-system';
import { requestRecording } from '../looks/recordings';
import type { Light } from '../store/fleet-store';
import {
  addLookFromFile,
  copyLook,
  exportLook,
  fetchLook,
  removeLook,
  removePreset,
  useLookActions,
} from '../store/look-actions';
import { useHousehold } from '../store/household-store';
import { useLibrary } from '../store/library-store';
import { askServer, loadLooks, useLookFiles, type LookFile } from '../store/look-files';
import { playLook, startNewLook } from '../store/look-play';
import {
  foundGroups,
  libraryFor,
  partOfRoomNote,
  playingRow,
  type LibraryGroup,
  type LibraryLook,
} from '../store/look-library';
import { endPreview, previewLook, useShownLights } from '../store/look-preview';
import { closePage } from '../store/navigation-store';
import { isAnyOn, isMixedLook, lookNameOf } from '../store/rooms';
import { LookStrip } from './look-strip';

const TILE_BRIGHTNESS = 0.85;
const ELSEWHERE = 'Shared looks';

// Read again while open, so a file written to the folder from a terminal shows up.
const LIST_EVERY_MS = 3000;

function useFreshLooks() {
  useEffect(() => {
    const read = () => void loadLooks();
    read();
    void askServer();
    const timer = setInterval(read, LIST_EVERY_MS);
    window.addEventListener('focus', read);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', read);
    };
  }, []);
}

// The takes start in page order when the page opens, so the top strips fill first and the rest are
// ready before they scroll into view.
function useWarmPreviews(looks: LibraryLook[]) {
  const latest = useRef(looks);
  useEffect(() => {
    latest.current = looks;
  });
  useEffect(() => {
    for (const { preview } of latest.current) {
      if (preview) requestRecording(preview).catch(() => undefined);
    }
  }, []);
}

// Deleting takes a second tap on the same key, and the key says so.
function useArmedDelete() {
  const [armed, setArmed] = useState<string | null>(null);
  return (key: string, remove: () => void) => (
    <TextKey
      onClick={() => {
        setArmed(armed === key ? null : key);
        if (armed === key) remove();
      }}
    >
      {armed === key ? 'TAP AGAIN TO DELETE' : 'DELETE'}
    </TextKey>
  );
}

type DeleteKey = ReturnType<typeof useArmedDelete>;

const COPIED_MS = 2000;

function CopyKey({ look }: { look: LookFile }) {
  const [isCopied, setCopied] = useState(false);
  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);
  return <TextKey onClick={() => void copyLook(look).then(setCopied)}>{isCopied ? 'COPIED' : 'COPY'}</TextKey>;
}

type FileActionsProps = { look: LookFile; deleteKey: DeleteKey; onRename: (look: LookFile) => void };

function FileActions({ look, deleteKey, onRename }: FileActionsProps) {
  const isOwn = !look.isExample;
  return (
    <>
      {isOwn && look.doc && <TextKey onClick={() => onRename(look)}>RENAME</TextKey>}
      {look.doc && <CopyKey look={look} />}
      {look.doc && <TextKey onClick={() => void exportLook(look)}>EXPORT</TextKey>}
      {isOwn && deleteKey(look.file, () => void removeLook(look))}
    </>
  );
}

const includesText = (text: string, wanted: string) => text.toLowerCase().includes(wanted);

function PublishedElsewhere({ wanted }: { wanted: string }) {
  const elsewhere = useLookFiles((files) => files.shelf.elsewhere);
  const fetching = useLookActions((actions) => actions.fetching);
  const ready = elsewhere.filter(({ id, name }) => id && includesText(name, wanted));
  if (ready.length === 0) return null;
  return (
    <LookGroup title={ELSEWHERE} note="Shared from another device. GET adds one to Mine.">
      {ready.map(({ familyId, id, name, presets }) => (
        <LookElsewhere
          key={familyId}
          name={name}
          description={presets.map((preset) => preset.name).join(', ')}
          action={
            <TextKey disabled={fetching !== null} onClick={() => id && void fetchLook(id, name)}>
              {fetching === id ? 'GETTING' : 'GET'}
            </TextKey>
          }
        />
      ))}
    </LookGroup>
  );
}

function useLibraryNote() {
  const listProblem = useLookFiles((files) => files.listProblem);
  const problem = useLibrary((library) => library.problem);
  const note = useLookActions((actions) => actions.note);
  return listProblem ?? problem ?? note;
}

type LookLibraryProps = {
  lights: Light[];
  query: string;
  isEditing: boolean;
  onQuery: (query: string) => void;
  onEditing: (isEditing: boolean) => void;
  onPaste: () => void;
  onRename: (look: LookFile) => void;
};

// Most used keeps the order it opened with, so a tap never moves the rows under the finger.
export function LookLibrary({ lights, query, isEditing, onQuery, onEditing, onPaste, onRename }: LookLibraryProps) {
  const mine = useLookFiles((files) => files.mine);
  const [plays] = useState(() => useHousehold.getState().lookPlays);
  const shelf = useLookFiles((files) => files.shelf);
  const note = useLibraryNote();
  const shownLights = useShownLights(lights);
  const playingName = isMixedLook(shownLights) ? null : lookNameOf(shownLights[0]);
  const wanted = query.trim().toLowerCase();
  const deleteKey = useArmedDelete();
  useFreshLooks();
  const library = libraryFor(lights, mine, shelf, plays);
  useWarmPreviews(library.flatMap(({ looks }) => looks));
  const groups = foundGroups(library, wanted);
  const playing = playingRow(groups, playingName);
  const canEdit = lights.some(({ isOnline, isOn }) => isOnline && isOn);

  const pick = ({ name, lights: players, animation }: LibraryLook) => {
    if (!animation) return;
    if (name === playingName && isAnyOn(shownLights)) closePage();
    else playLook(players, name, animation);
  };

  const hold = ({ name, lights: players, animation }: LibraryLook) => {
    if (animation) previewLook(players, name, animation);
  };

  const presetRows = (look: LibraryLook) =>
    look.presets.map(({ key, name, fullName, place, file, animation }) => (
      <LookPreset
        key={key}
        name={name}
        place={place}
        isPlaying={fullName === playingName}
        action={isEditing && file ? deleteKey(key, () => void removePreset(file)) : undefined}
        onPick={() => pick({ ...look, name: fullName, animation })}
        onHold={() => hold({ ...look, name: fullName, animation })}
        onHoldEnd={endPreview}
      />
    ));

  const groupRows = (group: LibraryGroup) => {
    const { title, note: groupNote, looks } = group;
    return (
      <LookGroup
        key={title}
        title={title}
        note={groupNote}
        action={
          title === 'Mine' && <TextKey onClick={() => onEditing(!isEditing)}>{isEditing ? 'DONE' : 'MANAGE'}</TextKey>
        }
      >
        {title === 'Mine' && !isEditing && (
          <ActionKey disabled={!canEdit} onClick={() => startNewLook(lights)}>
            New look
          </ActionKey>
        )}
        {isEditing && title === 'Mine' && (
          <KeyRow>
            <FileKey accept=".json,application/json" onFile={(file) => void addLookFromFile(file)}>
              ADD FROM A FILE
            </FileKey>
            <TextKey onClick={onPaste}>PASTE</TextKey>
          </KeyRow>
        )}
        {looks.map((look) => (
          <LookItem
            key={look.id}
            name={look.name}
            description={look.description}
            note={look.animation && partOfRoomNote(look, lights)}
            hasSound={look.hasSound}
            isPlaying={`${title}/${look.id}` === playing}
            disabled={isEditing || !look.animation}
            strip={<LookStrip source={look.preview} shape="tile" brightness={TILE_BRIGHTNESS} />}
            actions={isEditing && look.file && <FileActions look={look.file} deleteKey={deleteKey} onRename={onRename} />}
            onPick={() => pick(look)}
            onHold={() => hold(look)}
            onHoldEnd={endPreview}
          >
            {presetRows(look)}
          </LookItem>
        ))}
      </LookGroup>
    );
  };

  return (
    <>
      <LookSearch value={query} onChange={onQuery} />
      <LookList search={wanted}>
        {note && <LookProblem>{note}</LookProblem>}
        {groups.length === 0 && <LookProblem>{`No look matches ${query.trim()}.`}</LookProblem>}
        {groups.map(groupRows)}
        <PublishedElsewhere wanted={wanted} />
      </LookList>
    </>
  );
}
