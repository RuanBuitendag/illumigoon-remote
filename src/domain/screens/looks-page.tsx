import { useState } from 'react';
import { WhichLine } from '../../composites';
import type { Light } from '../store/fleet-store';
import { useNavigation } from '../store/navigation-store';
import { lightsInScope, type Room } from '../store/rooms';
import { AppPage } from './app-page';
import { LookLibrary } from './look-library';
import { PasteLookSheet } from './paste-look-sheet';
import { WhichLightsSheet } from './which-lights-sheet';

function whichLine(lights: Light[], rooms: Room[]) {
  const addresses = new Set(lights.map(({ address }) => address));
  const isExactly = (group: Light[]) =>
    group.length === addresses.size && group.every(({ address }) => addresses.has(address));
  const room = rooms.find(({ writableLights }) => isExactly(writableLights));
  if (room) return `On ${room.name}`;
  const [only] = lights;
  if (only && lights.length === 1) return `On ${only.name}`;
  if (isExactly(rooms.flatMap(({ writableLights }) => writableLights))) return 'On every light';
  return `On ${lights.length} lights`;
}

// With no room this page is for the whole house. Which lights lasts as long as the page is open.
export function LooksPage({ room, rooms }: { room: Room | undefined; rooms: Room[] }) {
  const scopeAddress = useNavigation((navigation) => navigation.scopeAddress);
  const [sheet, setSheet] = useState<'which' | 'paste' | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);
  const writable = rooms.flatMap(({ writableLights }) => writableLights);
  const opened = room ? lightsInScope(room, scopeAddress) : writable;
  const lights = picked ? writable.filter(({ address }) => picked.includes(address)) : opened;

  const pick = (addresses: string[]) => {
    setPicked(addresses);
    setSheet(null);
  };

  if (sheet === 'paste') return <PasteLookSheet onClose={() => setSheet(null)} />;
  if (sheet === 'which') {
    const chosen = lights.map(({ address }) => address);
    return <WhichLightsSheet rooms={rooms} picked={chosen} onDone={pick} onClose={() => setSheet(null)} />;
  }
  return (
    <AppPage
      title="Looks"
      intro="Tap to play. Hold to try."
    >
      <WhichLine text={whichLine(lights, rooms)} onClick={() => setSheet('which')} />
      <LookLibrary lights={lights} onPaste={() => setSheet('paste')} />
    </AppPage>
  );
}
