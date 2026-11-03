import { useState } from 'react';
import { PageFrame, WhichLine } from '../../composites';
import type { Light } from '../store/fleet-store';
import type { LookFile } from '../store/look-files';
import { closePage, setScope, useBackLabel, useNavigation } from '../store/navigation-store';
import { ALL_LIGHTS, lightsInScope, patchLights, type Room } from '../store/rooms';
import { LookLibrary } from './look-library';
import { PasteLookSheet } from './paste-look-sheet';
import { RenameLookSheet } from './rename-look-sheet';
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

// A choice the open room can hold goes back to it: the whole room, or one of its lights.
function keepInRoom(room: Room, lights: Light[]) {
  if (!lights.every(({ roomId }) => roomId === room.id)) return;
  const [only] = lights;
  if (isExactly(lights, room.writableLights)) setScope(ALL_LIGHTS);
  else if (only && lights.length === 1) setScope(only.address);
}

type Sheet = { kind: 'which' } | { kind: 'paste' } | { kind: 'rename'; look: LookFile };

// With no room this page is for the whole house. Which lights lasts as long as the page is open.
export function LooksPage({ room, rooms }: { room: Room | undefined; rooms: Room[] }) {
  const scopeAddress = useNavigation((navigation) => navigation.scopeAddress);
  const isRoomOpen = useNavigation(({ roomId, isRoomOpen: isOpen }) => isOpen && roomId === room?.id);
  const backLabel = useBackLabel(room);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [isEditing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const writable = rooms.flatMap(({ writableLights }) => writableLights);
  const opened = room ? lightsInScope(room, scopeAddress) : writable;
  const lights = picked ? writable.filter(({ address }) => picked.includes(address)) : opened;

  const pick = (addresses: string[]) => {
    setPicked(addresses);
    setSheet(null);
    if (room && isRoomOpen) keepInRoom(room, writable.filter(({ address }) => addresses.includes(address)));
  };

  const close = () => setSheet(null);
  if (sheet?.kind === 'paste') return <PasteLookSheet onClose={close} />;
  if (sheet?.kind === 'rename') return <RenameLookSheet look={sheet.look} onClose={close} />;
  if (sheet?.kind === 'which') {
    const chosen = lights.map(({ address }) => address);
    return <WhichLightsSheet rooms={rooms} room={room} picked={chosen} onDone={pick} onClose={close} />;
  }
  return (
    <PageFrame title="Looks" intro="Tap to play. Hold to try." backLabel={backLabel} onBack={closePage}>
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
  );
}
