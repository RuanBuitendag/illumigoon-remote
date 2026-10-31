import { useEffect, useState } from 'react';
import { HeadingRow, PageFrame, PageHint, PageSection, ScanNote } from '../../composites';
import { Eyebrow, OptionRow, TextField, TextKey } from '../../design-system';
import type { NewLight } from '../light-network/protocol';
import { SCAN_PREVIEW } from '../looks/recordings';
import { addNewLightToRoom, flashNewLight, FLASH_MS, useFleet } from '../store/fleet-store';
import { closePage } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import { LookStrip } from './look-strip';

const MAX_LIGHT_NAME = 15;

function useFlash(light: NewLight, isFlashing: boolean) {
  useEffect(() => {
    if (!isFlashing) return;
    flashNewLight(light, true);
    const renewal = window.setInterval(() => flashNewLight(light, true), FLASH_MS / 2);
    return () => {
      window.clearInterval(renewal);
      flashNewLight(light, false);
    };
  }, [light, isFlashing]);
}

type NewLightFormProps = {
  light: NewLight;
  number: number;
  rooms: Room[];
  onAdded: (message: string) => void;
};

function NewLightForm({ light, number, rooms, onAdded }: NewLightFormProps) {
  const [isFlashing, setFlashing] = useState(false);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  useFlash(light, isFlashing);

  const add = () => {
    setFlashing(false);
    addNewLightToRoom(light, roomId, name.trim());
    onAdded(`Added to ${rooms.find((room) => room.id === roomId)?.name} as ${name.trim()}.`);
  };

  return (
    <PageSection>
      <HeadingRow heading={<Eyebrow>{`NEW LIGHT ${number}`}</Eyebrow>}>
        <TextKey onClick={() => setFlashing(!isFlashing)}>{isFlashing ? 'STOP' : 'FLASH IT'}</TextKey>
      </HeadingRow>
      <TextField
        size="medium"
        label="Name of the new light"
        placeholder="Name"
        maxLength={MAX_LIGHT_NAME}
        value={name}
        onChange={setName}
      />
      <OptionRow
        label="Room"
        options={rooms.map(({ id, name: roomName }) => ({ value: id, name: roomName }))}
        value={roomId}
        onChange={setRoomId}
      />
      <TextKey disabled={!name.trim() || !roomId} onClick={add}>
        ADD LIGHT
      </TextKey>
    </PageSection>
  );
}

export function AddLightPage({ rooms }: { rooms: Room[] }) {
  const newLights = useFleet((fleet) => fleet.newLights);
  const [added, setAdded] = useState<string[]>([]);
  const isDone = added.length > 0 && newLights.length === 0;
  const doneText = added.length === 1 ? '1 new light added.' : `${added.length} new lights added.`;
  return (
    <PageFrame
      title="Add a light"
      backLabel="Rooms"
      onBack={closePage}
      intro="Plug in the new lights and keep this phone nearby. You can set up several in one go."
    >
      {newLights.length === 0 && !isDone && (
        <ScanNote strip={<LookStrip source={SCAN_PREVIEW} shape="room" />}>Looking for new lights.</ScanNote>
      )}
      {added.map((message) => (
        <PageHint key={message}>{message}</PageHint>
      ))}
      {newLights.map((light, index) => (
        <NewLightForm
          key={light.mac}
          light={light}
          number={index + 1}
          rooms={rooms}
          onAdded={(message) => setAdded([...added, message])}
        />
      ))}
      {isDone && (
        <PageSection>
          <PageHint>{doneText}</PageHint>
          <TextKey onClick={closePage}>DONE</TextKey>
        </PageSection>
      )}
    </PageFrame>
  );
}
