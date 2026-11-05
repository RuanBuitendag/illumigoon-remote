import { useState } from 'react';
import { JumpSheet as JumpSheetLayout, type JumpGroup } from '../../composites';
import { libraryFor } from '../store/look-library';
import { useLookFiles } from '../store/look-files';
import { closeJump, HOUSE_NAME, jumpHome, jumpToLook, jumpToRoom } from '../store/navigation-store';
import { playingLookName, type Room } from '../store/rooms';

type LookFiles = ReturnType<typeof useLookFiles.getState>;

const MOST_HITS = 12;

const answers = (text: string, wanted: string) => text.toLowerCase().includes(wanted);

// Every look once, by name, with the group it is in.
function lookHits(rooms: Room[], files: Pick<LookFiles, 'mine' | 'shelf'>, wanted: string) {
  const lights = rooms.flatMap(({ writableLights }) => writableLights);
  const { mine, shelf } = files;
  const groups = libraryFor(lights, mine, shelf, { plays: {}, favourites: [] });
  const seen = new Set<string>();
  return groups.flatMap(({ title, looks }) =>
    looks.flatMap(({ name }) => {
      if (seen.has(name) || !answers(name, wanted)) return [];
      seen.add(name);
      return [{ id: `look-${name}`, name, detail: title, onPick: () => jumpToLook(name) }];
    }),
  );
}

function roomHits(rooms: Room[], wanted: string) {
  return rooms
    .filter(({ name }) => answers(name, wanted))
    .map((room) => ({
      id: `room-${room.id}`,
      name: room.name,
      detail: playingLookName(room.writableLights) ?? '',
      onPick: () => jumpToRoom(room.id),
    }));
}

// The one house; picking it goes to its rooms.
function houseHits(wanted: string) {
  if (!answers(HOUSE_NAME, wanted)) return [];
  return [{ id: 'house-home', name: HOUSE_NAME, detail: 'House', onPick: jumpHome }];
}

// A long press on the bar, or Ctrl+K on the laptop, opens it (LIFE-1964).
export function JumpSheet({ rooms }: { rooms: Room[] }) {
  const [query, setQuery] = useState('');
  const mine = useLookFiles((files) => files.mine);
  const shelf = useLookFiles((files) => files.shelf);
  const wanted = query.trim().toLowerCase();
  const groups: JumpGroup[] = [
    { title: 'ROOMS', hits: roomHits(rooms, wanted) },
    { title: 'LOOKS', hits: lookHits(rooms, { mine, shelf }, wanted).slice(0, MOST_HITS) },
    { title: 'HOUSES', hits: houseHits(wanted) },
  ];
  return (
    <JumpSheetLayout
      query={query}
      groups={groups}
      empty={`No room, look or house matches ${query.trim()}.`}
      onQuery={setQuery}
      onClose={closeJump}
    />
  );
}
