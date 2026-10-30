import { useMemo, useState } from 'react';
import { RoomScreen } from './screens/room-screen';
import { RoomsScreen } from './screens/rooms-screen';
import { useFleet } from './store/fleet-store';
import { groupRooms } from './store/rooms';

export function App() {
  const lights = useFleet((fleet) => fleet.lights);
  const rooms = useMemo(() => groupRooms(lights), [lights]);
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);
  const openRoom = rooms.find((room) => room.id === openRoomId);

  if (openRoom) return <RoomScreen room={openRoom} onBack={() => setOpenRoomId(null)} />;
  return <RoomsScreen rooms={rooms} onOpen={(room) => setOpenRoomId(room.id)} />;
}
