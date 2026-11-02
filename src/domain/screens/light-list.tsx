import { LightBox, LightItem, LightSwitch, SwitchSegment } from '../../composites';
import { useRecording } from '../looks/recordings';
import { flashLights, setPower, type Light } from '../store/fleet-store';
import { useShownLights } from '../store/look-preview';
import { openCard } from '../store/navigation-store';
import { isAnyOn, lookNameOf, previewOfAnimation, type Room } from '../store/rooms';

// An off light shows the unlit colour, so it never asks for a recording.
export function usePaint({ isOnline, isOn, animation }: Light) {
  return useRecording(isOnline && isOn ? previewOfAnimation(animation ?? null) : null);
}

function LightSegment({ light }: { light: Light }) {
  const recording = usePaint(light);
  return <SwitchSegment paint={recording?.gradient} />;
}

export function LightSegments({ lights }: { lights: Light[] }) {
  return lights.map((light) => <LightSegment key={light.address} light={light} />);
}

export const isUnreachable = ({ isOnline, isLockedByOther }: Light) => !isOnline || isLockedByOther;

export function OneLightSwitch({ light }: { light: Light }) {
  return (
    <LightSwitch
      label={`${light.name} power`}
      isOn={light.isOnline && light.isOn}
      glow="light"
      disabled={isUnreachable(light)}
      onToggle={() => setPower([light], !light.isOn)}
    >
      <LightSegment light={light} />
    </LightSwitch>
  );
}

export function RoomSwitch({ room }: { room: Room }) {
  const shownLights = useShownLights(room.lights);
  const isOn = isAnyOn(shownLights.filter(({ isOnline }) => isOnline));
  return (
    <LightSwitch
      label={`${room.name} power`}
      isOn={isOn}
      glow="room"
      disabled={room.writableLights.length === 0}
      onToggle={() => setPower(room.writableLights, !isOn)}
    >
      <LightSegments lights={shownLights} />
    </LightSwitch>
  );
}

export function lightNote(light: Light) {
  if (!light.isOnline) return "Isn't answering";
  if (!light.isOn) return 'Off';
  const level = `${Math.round(light.brightness * 100)}%`;
  const look = lookNameOf(light);
  return look ? `${look} · ${level}` : level;
}

function LightLine({ light }: { light: Light }) {
  const recording = usePaint(light);
  return (
    <LightItem
      name={light.name}
      note={lightNote(light)}
      tint={recording?.tint}
      power={<OneLightSwitch light={light} />}
      disabled={isUnreachable(light)}
      onOpen={() => openCard(light.address)}
      onHold={() => flashLights([light])}
    />
  );
}

export function LightList({ room }: { room: Room }) {
  const lights = useShownLights(room.lights);
  return (
    <LightBox>
      {lights.map((light) => (
        <LightLine key={light.address} light={light} />
      ))}
    </LightBox>
  );
}
