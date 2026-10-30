import { useEffect, useState } from 'react';
import { APP_VERSION, useUpdateError } from '../app-update/app-update';
import { LevelSlider } from '../components/level-slider';
import { PowerSwitch } from '../components/power-switch';
import { setBrightness, setPower } from '../store/fleet-store';
import { isRoomOn, roomBrightness, type Room } from '../store/rooms';

const NO_LIGHTS_NOTICE_MS = 6000;

function RoomRow({ room, onOpen }: { room: Room; onOpen: () => void }) {
  const isLocked = room.writableLights.length === 0;
  const count = room.lights.length;
  return (
    <section className="room-row">
      <div className="row">
        <button type="button" className="room-name" onClick={onOpen} disabled={isLocked}>
          <strong>{room.id || 'No room'}</strong>
          <small>
            {count} {count === 1 ? 'light' : 'lights'}
            {isLocked ? ', locked' : ''}
          </small>
        </button>
        <PowerSwitch
          label={`${room.id} power`}
          checked={isRoomOn(room)}
          disabled={isLocked}
          onChange={(isOn) => setPower(room.writableLights, isOn)}
        />
      </div>
      <LevelSlider
        label={`${room.id} brightness`}
        value={roomBrightness(room)}
        min={0}
        max={1}
        step={0.01}
        disabled={isLocked}
        onChange={(brightness) => setBrightness(room.writableLights, brightness)}
      />
    </section>
  );
}

function SearchNotice() {
  const [isLate, setIsLate] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setIsLate(true), NO_LIGHTS_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <p className="notice">
      {isLate ? 'No lights found. Check that this phone is on the home Wi-Fi.' : 'Looking for lights.'}
    </p>
  );
}

export function RoomsScreen({ rooms, onOpen }: { rooms: Room[]; onOpen: (room: Room) => void }) {
  const updateError = useUpdateError((update) => update.message);
  return (
    <main>
      <h1>Illumigoon</h1>
      {rooms.length === 0 && <SearchNotice />}
      {rooms.map((room) => (
        <RoomRow key={room.id} room={room} onOpen={() => onOpen(room)} />
      ))}
      <p className="version">Version {APP_VERSION}</p>
      {updateError && <p className="version">Update failed: {updateError}</p>}
    </main>
  );
}
