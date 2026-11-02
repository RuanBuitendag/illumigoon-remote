import { useEffect, useState } from 'react';
import { HeadingRow, PageHint, PageSection } from '../../composites';
import { ActionKey, Eyebrow, TextField, TextKey } from '../../design-system';
import {
  findLightOnItsOwnWifi,
  flashLightOnItsOwnWifi,
  lookForLights,
  sendWifiToLight,
  useHasJoinedWifi,
  useLightOnItsOwnWifi,
} from '../store/fleet-store';
import { useFlash } from './use-flash';

export const MAX_LIGHT_NAME = 15;
const MAX_ROOM_NAME = 31;
const LOOK_AGAIN_MS = 10000;
const JOIN_WAIT_MS = 120000;

type SentLight = { id: string; name: string };

// The phone only sees the light once it is back on the home Wi-Fi, so this keeps looking until then.
function SentNote({ id, name }: SentLight) {
  const hasJoined = useHasJoinedWifi(id);
  const [hasWaited, setWaited] = useState(false);

  useEffect(() => {
    if (hasJoined) return;
    const search = window.setInterval(lookForLights, LOOK_AGAIN_MS);
    const timer = window.setTimeout(() => setWaited(true), JOIN_WAIT_MS);
    return () => {
      window.clearInterval(search);
      window.clearTimeout(timer);
    };
  }, [hasJoined]);

  if (hasJoined) return <PageHint>{`${name} is on the home Wi-Fi.`}</PageHint>;
  if (hasWaited) {
    return (
      <PageHint>
        {`${name} has not joined. If its Modulight Wi-Fi comes back, the Wi-Fi name or password was wrong. Set it up again.`}
      </PageHint>
    );
  }
  return <PageHint>{`Sent to ${name}. Join your home Wi-Fi again. The light joins it within a minute.`}</PageHint>;
}

// For a light with no working light near it, so nothing can pass the home Wi-Fi on to it.
export function OwnWifiForm() {
  // A light with no Wi-Fi sends no heartbeat, so its device information is what says it answered.
  const lightId = useLightOnItsOwnWifi()?.deviceId;
  const [isLooking, setLooking] = useState(false);
  const [sentLights, setSentLights] = useState<SentLight[]>([]);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [isFlashing, setFlashing] = useState(false);
  useFlash(flashLightOnItsOwnWifi, isFlashing);

  const find = () => {
    setLooking(true);
    findLightOnItsOwnWifi();
  };

  const send = () => {
    if (!lightId) return;
    setFlashing(false);
    flashLightOnItsOwnWifi(false);
    sendWifiToLight({ name: name.trim(), room: room.trim(), wifiName: wifiName.trim(), wifiPassword });
    setSentLights([...sentLights.filter(({ id }) => id !== lightId), { id: lightId, name: name.trim() }]);
    setName('');
    setLooking(false);
  };

  return (
    <PageSection>
      <Eyebrow>ON THE LIGHT&apos;S OWN WI-FI</Eyebrow>
      {sentLights.map((light) => (
        <SentNote key={light.id} {...light} />
      ))}
      {!lightId && (
        <>
          <PageHint>In Settings, join the Wi-Fi that starts with Modulight. Its password is 00000000.</PageHint>
          <ActionKey onClick={find}>Find the light</ActionKey>
          {isLooking && <PageHint>Looking for the light.</PageHint>}
        </>
      )}
      {lightId && (
        <>
          <HeadingRow heading={<PageHint>{`Found light ${lightId}.`}</PageHint>}>
            <TextKey onClick={() => setFlashing(!isFlashing)}>{isFlashing ? 'STOP' : 'FLASH IT'}</TextKey>
          </HeadingRow>
          <TextField
            size="large"
            label="Light name"
            placeholder="Name"
            maxLength={MAX_LIGHT_NAME}
            value={name}
            onChange={setName}
          />
          <TextField
            size="large"
            label="Room"
            placeholder="Room"
            maxLength={MAX_ROOM_NAME}
            value={room}
            onChange={setRoom}
          />
          <TextField size="large" label="Home Wi-Fi name" placeholder="Wi-Fi name" value={wifiName} onChange={setWifiName} />
          <TextField
            size="large"
            type="password"
            label="Home Wi-Fi password"
            placeholder="Password"
            value={wifiPassword}
            onChange={setWifiPassword}
          />
          <ActionKey disabled={!name.trim() || !room.trim() || !wifiName.trim()} onClick={send}>
            Connect light
          </ActionKey>
        </>
      )}
    </PageSection>
  );
}
