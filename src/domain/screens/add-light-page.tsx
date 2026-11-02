import { useEffect, useState } from 'react';
import { HeadingRow, PageFrame, PageHint, PageSection, ScanNote } from '../../composites';
import { Eyebrow, OptionRow, TextField, TextKey } from '../../design-system';
import type { NewLight } from '../light-network/protocol';
import { SCAN_PREVIEW } from '../looks/recordings';
import {
  addLightByAddress,
  addNewLightToRoom,
  flashNewLight,
  FLASH_MS,
  searchAgain,
  useFleet,
} from '../store/fleet-store';
import { closePage } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import { LookStrip } from './look-strip';

const MAX_LIGHT_NAME = 15;
const SCAN_MS = 12000;
const ADDRESS_WAIT_MS = 6000;

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

// For a light the network does not announce, which is every light on some networks.
function AddressForm() {
  const [address, setAddress] = useState('');
  const [sought, setSought] = useState('');
  const [hasWaited, setWaited] = useState(false);
  const isFound = useFleet((fleet) => fleet.lights[sought]?.isOnline === true);

  useEffect(() => {
    if (!sought) return;
    const timer = window.setTimeout(() => setWaited(true), ADDRESS_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [sought]);

  const add = () => {
    setWaited(false);
    setSought(addLightByAddress(address));
    setAddress('');
  };

  const soughtText = () => {
    if (isFound) return `Found ${sought}.`;
    return hasWaited ? `Nothing answers at ${sought}.` : `Looking at ${sought}.`;
  };

  return (
    <PageSection>
      <Eyebrow>BY ADDRESS</Eyebrow>
      <PageHint>Your router lists the address of each device on the network.</PageHint>
      <TextField
        size="medium"
        label="Address of the light"
        placeholder="Like 192.168.0.40"
        value={address}
        onChange={setAddress}
      />
      <TextKey disabled={!address.trim()} onClick={add}>
        ADD ADDRESS
      </TextKey>
      {sought && <PageHint>{soughtText()}</PageHint>}
    </PageSection>
  );
}

function ScanStatus() {
  const [scan, setScan] = useState(0);
  const [isOver, setOver] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOver(true), SCAN_MS);
    return () => window.clearTimeout(timer);
  }, [scan]);

  const again = () => {
    setOver(false);
    setScan(scan + 1);
    searchAgain();
  };

  if (!isOver) {
    return <ScanNote strip={<LookStrip source={SCAN_PREVIEW} shape="room" />}>Looking for new lights.</ScanNote>;
  }
  return (
    <PageSection>
      <PageHint>Nothing found. Check that the new light has power and stays near a working light.</PageHint>
      <TextKey onClick={again}>SEARCH AGAIN</TextKey>
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
      intro="Plug in the new lights and stay close to them. You can set up several in one go."
    >
      {newLights.length === 0 && !isDone && <ScanStatus />}
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
      {newLights.length === 0 && <AddressForm />}
      {isDone && (
        <PageSection>
          <PageHint>{doneText}</PageHint>
          <TextKey onClick={closePage}>DONE</TextKey>
        </PageSection>
      )}
    </PageFrame>
  );
}
