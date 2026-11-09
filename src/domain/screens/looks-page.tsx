import { useState } from 'react';
import { PageFrame, WhichLine } from '../../composites';
import { AddKey } from '../../design-system';
import type { Light } from '../store/fleet-store';
import type { LookFile } from '../store/look-files';
import { startNewLook } from '../store/look-play';
import { chooseLights, closePage, setLooksQuery, useBackLabel, useNavigation } from '../store/navigation-store';
import { lightsInScope, patchLights, type Room } from '../store/rooms';
import { LookLibrary } from './look-library';
import { PasteLookSheet } from './paste-look-sheet';
import { RenameLookSheet } from './rename-look-sheet';
import { SceneRow } from './scene-row';
import { WhichLightsSheet } from './which-lights-sheet';

// Only lights that play looks count, so a room is still named when one of its lights cannot.
function isExactly(lights: Light[], group: Light[]) {
  const hasPlayers = patchLights(group).length > 0;
  const wanted = hasPlayers ? patchLights(group) : group;
  const addresses = new Set((hasPlayers ? patchLights(lights) : lights).map(({ address }) => address));
  return wanted.length === addresses.size && wanted.every(({ address }) => addresses.has(address));
}

function whichLine(lights: Light[], rooms: Room[]) {
  const room = rooms.find(({ writableLights }) => isExactly(lights, writableLights));
  if (room) return `On ${room.name}`;
  const [only] = lights;
  if (only && lights.length === 1) return `On ${only.name}`;
  if (isExactly(lights, rooms.flatMap(({ writableLights }) => writableLights))) return 'On every light';
  return `On ${lights.length} lights`;
}

// A choice the open room can hold goes back to it: the whole room, or some of its lights.
function keepInRoom(room: Room, lights: Light[]) {
  if (!lights.every(({ roomId }) => roomId === room.id)) return;
  chooseLights(isExactly(lights, room.writableLights) ? [] : lights.map(({ address }) => address));
}

type Sheet = { kind: 'which' } | { kind: 'paste' } | { kind: 'rename'; look: LookFile };

// With no room this page is for the whole house. Which lights lasts as long as the page is open.
// The Looks place shares its find text with the jump sheet. A page opened from a room keeps its own.
function useLooksQuery(isPlace: boolean | undefined): [string, (query: string) => void] {
  const [ownQuery, setOwnQuery] = useState('');
  const placeQuery = useNavigation((navigation) => navigation.looksQuery);
  return isPlace ? [placeQuery, setLooksQuery] : [ownQuery, setOwnQuery];
}

// A place of the bar has no way back.
const backOf = (isPlace: boolean | undefined, backLabel: string) =>
  isPlace ? {} : { backLabel, onBack: closePage };

type LooksPageProps = {
  room: Room | undefined;
  rooms: Room[];
  // The Looks place of the bar: no way back, and the find text is the jump sheet's too.
  isPlace?: boolean;
};

export function LooksPage({ room, rooms, isPlace }: LooksPageProps) {
  const chosenAddresses = useNavigation((navigation) => navigation.chosenAddresses);
  const isRoomOpen = useNavigation(({ roomId, isRoomOpen: isOpen }) => isOpen && roomId === room?.id);
  const backLabel = useBackLabel(room);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [isEditing, setEditing] = useState(false);
  const [query, setQuery] = useLooksQuery(isPlace);
  const writable = rooms.flatMap(({ writableLights }) => writableLights);
  const opened = room ? lightsInScope(room, chosenAddresses) : writable;
  const lights = picked ? writable.filter(({ address }) => picked.includes(address)) : opened;

  const pick = (addresses: string[]) => {
    setPicked(addresses);
    if (room && isRoomOpen) keepInRoom(room, writable.filter(({ address }) => addresses.includes(address)));
  };

  const close = () => setSheet(null);
  const canEdit = lights.some(({ isOnline, isOn }) => isOnline && isOn);
  const newLook = (
    <AddKey disabled={!canEdit} onClick={() => startNewLook(lights)}>
      + NEW LOOK
    </AddKey>
  );
  const chosen = lights.map(({ address }) => address);
  // The sheet opens over the page, so the key that opened it is still there to take the focus back.
  return (
    <>
      {sheet?.kind === 'paste' && <PasteLookSheet onClose={close} />}
      {sheet?.kind === 'rename' && <RenameLookSheet look={sheet.look} onClose={close} />}
      {sheet?.kind === 'which' && (
        <WhichLightsSheet rooms={rooms} room={room} picked={chosen} onDone={pick} onClose={close} />
      )}
      <PageFrame
        title="Looks"
        action={newLook}
        {...backOf(isPlace, backLabel)}
      >
        {isPlace && <SceneRow rooms={rooms} />}
        <WhichLine text={whichLine(lights, rooms)} onClick={() => setSheet({ kind: 'which' })} />
        <LookLibrary
          lights={lights}
          query={query}
          isEditing={isEditing}
          onQuery={setQuery}
          onEditing={setEditing}
          onPaste={() => setSheet({ kind: 'paste' })}
          onRename={(look) => setSheet({ kind: 'rename', look })}
        />
      </PageFrame>
    </>
  );
}
