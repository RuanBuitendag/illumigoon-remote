import { useEffect, useState } from 'react';
import {
  LookElsewhere,
  LookGroup,
  LookItem,
  LookList,
  LookPreset,
  LookProblem,
  LookSearch,
} from '../../composites';
import { FileKey, KeyRow, TextKey } from '../../design-system';
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
import { useLibrary } from '../store/library-store';
import { askServer, loadLooks, useLookFiles, type LookFile } from '../store/look-files';
import { playLook, startNewLook } from '../store/look-play';
import { libraryFor, partOfRoomNote, type LibraryGroup, type LibraryLook } from '../store/look-library';
import { endPreview, previewLook, useShownLights } from '../store/look-preview';
import { closePage } from '../store/navigation-store';
import { isAnyOn, isMixedLook, lookNameOf } from '../store/rooms';
import { LookStrip } from './look-strip';

const TILE_BRIGHTNESS = 0.85;
const ELSEWHERE = 'On the patch server';

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

// Deleting takes a second tap on the same key.
function useArmedDelete() {
  const [armed, setArmed] = useState<string | null>(null);
  return (key: string, remove: () => void) => (
    <TextKey
      onClick={() => {
        setArmed(armed === key ? null : key);
        if (armed === key) remove();
      }}
    >
      {armed === key ? 'DELETE?' : 'DELETE'}
    </TextKey>
  );
}

type DeleteKey = ReturnType<typeof useArmedDelete>;

function FileActions({ look, deleteKey }: { look: LookFile; deleteKey: DeleteKey }) {
  return (
    <>
      {look.doc && <TextKey onClick={() => void copyLook(look)}>COPY</TextKey>}
      {look.doc && <TextKey onClick={() => void exportLook(look)}>EXPORT</TextKey>}
      {!look.isExample && deleteKey(look.file, () => void removeLook(look))}
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
    <LookGroup title={ELSEWHERE} note="Published looks you do not have yet">
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

const hasName = ({ name, presets }: LibraryLook, wanted: string) =>
  [name, ...presets.map((preset) => preset.name)].some((text) => includesText(text, wanted));

function keptLooks(groups: LibraryGroup[], isKept: (look: LibraryLook) => boolean) {
  const kept = groups.map((group) => ({ ...group, looks: group.looks.filter(isKept) }));
  return kept.filter(({ looks }) => looks.length > 0);
}

// Names first. Descriptions only answer when no name does, so a short word finds what it says.
function foundGroups(groups: LibraryGroup[], wanted: string) {
  if (!wanted) return groups;
  const named = keptLooks(groups, (look) => hasName(look, wanted));
  return named.length > 0 ? named : keptLooks(groups, ({ description }) => includesText(description, wanted));
}

export function LookLibrary({ lights, onPaste }: { lights: Light[]; onPaste: () => void }) {
  const mine = useLookFiles((files) => files.mine);
  const examples = useLookFiles((files) => files.examples);
  const shelf = useLookFiles((files) => files.shelf);
  const note = useLibraryNote();
  const shownLights = useShownLights(lights);
  const playingName = isMixedLook(shownLights) ? null : lookNameOf(shownLights[0]);
  const [isEditing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const wanted = query.trim().toLowerCase();
  const deleteKey = useArmedDelete();
  useFreshLooks();
  const groups = foundGroups(libraryFor(lights, mine, examples, shelf), wanted);
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
          title === 'Mine' && <TextKey onClick={() => setEditing(!isEditing)}>{isEditing ? 'DONE' : 'MANAGE'}</TextKey>
        }
      >
        {title === 'Mine' && !isEditing && (
          <KeyRow>
            <TextKey disabled={!canEdit} onClick={() => startNewLook(lights)}>
              NEW LOOK
            </TextKey>
          </KeyRow>
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
            isPlaying={look.name === playingName}
            disabled={isEditing || !look.animation}
            strip={<LookStrip source={look.preview} shape="tile" brightness={TILE_BRIGHTNESS} />}
            actions={isEditing && look.file && <FileActions look={look.file} deleteKey={deleteKey} />}
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
      <LookSearch value={query} onChange={setQuery} />
      <LookList search={wanted}>
        {note && <LookProblem>{note}</LookProblem>}
        {groups.length === 0 && <LookProblem>{`No look called ${query.trim()}.`}</LookProblem>}
        {groups.map(groupRows)}
        <PublishedElsewhere wanted={wanted} />
      </LookList>
    </>
  );
}
