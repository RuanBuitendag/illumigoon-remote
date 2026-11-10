import { useEffect, useRef, useState } from 'react';
import {
  LookElsewhere,
  LookGroup,
  LookItem,
  LookList,
  LookPreset,
  LookProblem,
} from '../../composites';
import { ArmedKey, FileKey, KeyGroup, KeyRow, TextKey, type FoldedKey } from '../../design-system';
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
import { toggleFavourite, useHousehold } from '../store/household-store';
import { useLibrary } from '../store/library-store';
import { askServer, loadLooks, useLookFiles, type LookFile } from '../store/look-files';
import { playLook } from '../store/look-play';
import {
  foundGroups,
  libraryFor,
  partOfRoomNote,
  playingRow,
  sharedPartOfRoomNote,
  type LibraryGroup,
  type LibraryLook,
} from '../store/look-library';
import { endPreview, previewLook, useShownLights } from '../store/look-preview';
import { closePage } from '../store/navigation-store';
import { playingLookName, playsExactly } from '../store/rooms';
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

type FileActionsProps = { look: LookFile; onRename: (look: LookFile) => void };

// Rename and copy show; export and delete fold into MORE when the row has no room (D102).
function FileActions({ look, onRename }: FileActionsProps) {
  const isOwn = !look.isExample;
  const doc = look.doc;
  const more: FoldedKey[] = [
    ...(doc ? [{ name: 'EXPORT', onSelect: () => void exportLook(look) }] : []),
    ...(isOwn ? [{ name: 'DELETE', isDestructive: true, onSelect: () => void removeLook(look) }] : []),
  ];
  return (
    <KeyGroup more={more}>
      {isOwn && doc && <TextKey onClick={() => onRename(look)}>RENAME</TextKey>}
      {doc && <CopyKey look={look} />}
    </KeyGroup>
  );
}

const includesText = (text: string, wanted: string) => text.toLowerCase().includes(wanted);

function PublishedElsewhere({ wanted }: { wanted: string }) {
  const elsewhere = useLookFiles((files) => files.shelf.elsewhere);
  const fetching = useLookActions((actions) => actions.fetching);
  const ready = elsewhere.filter(({ id, name }) => id && includesText(name, wanted));
  if (ready.length === 0) return null;
  return (
    <LookGroup title={ELSEWHERE}>
      {ready.map(({ familyId, id, name }) => (
        <LookElsewhere
          key={familyId}
          name={name}
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
  onEditing: (isEditing: boolean) => void;
  onPaste: () => void;
  onRename: (look: LookFile) => void;
};

// Most used keeps the order it opened with, so a tap never moves the rows under the finger.
export function LookLibrary({ lights, query, isEditing, onEditing, onPaste, onRename }: LookLibraryProps) {
  const mine = useLookFiles((files) => files.mine);
  const [plays] = useState(() => useHousehold.getState().lookPlays);
  const favourites = useHousehold((household) => household.favouriteLooks);
  const shelf = useLookFiles((files) => files.shelf);
  const note = useLibraryNote();
  const shownLights = useShownLights(lights);
  const playingName = playingLookName(shownLights);
  const wanted = query.trim().toLowerCase();
  useFreshLooks();
  const library = libraryFor(lights, mine, shelf, { plays, favourites });
  useWarmPreviews(library.flatMap(({ looks }) => looks));
  const groups = foundGroups(library, wanted);
  const playing = playingRow(groups, playingName);
  const sharedNote = sharedPartOfRoomNote(library, lights);
  const lookNote = (look: LibraryLook) => {
    const note = look.animation && partOfRoomNote(look, lights);
    return note === sharedNote ? null : note;
  };

  const pick = ({ name, lights: players, animation }: LibraryLook) => {
    if (!animation) return;
    if (name === playingName && playsExactly(shownLights, animation)) closePage();
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
        action={isEditing && file ? <ArmedKey name="DELETE" onSelect={() => void removePreset(file)} /> : undefined}
        onPick={() => pick({ ...look, name: fullName, animation })}
        onHold={() => hold({ ...look, name: fullName, animation })}
        onHoldEnd={endPreview}
      />
    ));

  const groupRows = (group: LibraryGroup) => {
    const { title, looks } = group;
    return (
      <LookGroup
        key={title}
        title={title}
        action={
          title === 'Mine' && <TextKey onClick={() => onEditing(!isEditing)}>{isEditing ? 'DONE' : 'MANAGE'}</TextKey>
        }
      >
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
            note={lookNote(look)}
            hasSound={look.hasSound}
            isPlaying={`${title}/${look.id}` === playing}
            disabled={isEditing || !look.animation}
            strip={<LookStrip source={look.preview} shape="tile" brightness={TILE_BRIGHTNESS} />}
            actions={isEditing && look.file && <FileActions look={look.file} onRename={onRename} />}
            isFavourite={favourites.includes(look.name)}
            onStar={look.animation ? () => toggleFavourite(look.name) : undefined}
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
    <LookList search={wanted}>
        {sharedNote && <LookProblem>{sharedNote}</LookProblem>}
        {note && <LookProblem>{note}</LookProblem>}
        {groups.length === 0 && <LookProblem>{`No look matches ${query.trim()}.`}</LookProblem>}
        {groups.map(groupRows)}
        <PublishedElsewhere wanted={wanted} />
    </LookList>
  );
}
