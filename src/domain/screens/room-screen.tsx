import { useState } from 'react';
import {
  LevelRow,
  LightCard,
  LookHeading,
  MoreRow,
  QuietNote,
  RoomLayout,
  RoomSection,
  SliderRow,
} from '../../composites';
import { PowerKey, TextKey } from '../../design-system';
import { flashLights, setBrightness, setPower, type Light } from '../store/fleet-store';
import { playLook } from '../store/look-play';
import { useShownLights } from '../store/look-preview';
import { chooseLight, chooseLights, closeRoom, openPage, useNavigation } from '../store/navigation-store';
import {
  editedLook,
  highestBrightness,
  isAnyOn,
  hasOneLookName,
  isMixedLook,
  lightsInScope,
  lookNameOf,
  previewOfAnimation,
  type Room,
} from '../store/rooms';
import { offTimerNote } from '../store/schedules';
import { LookControls } from './look-controls';
import { LookStrip } from './look-strip';
import { OffTimerSheet, schedulingLights } from './off-timer-sheet';
import { FavouriteLookRow } from './favourite-looks';
import { RoomLockNote } from './room-summary';
import { SceneRow } from './scene-row';

const PERCENT = 100;

// The look's name stands under the lights. A light repeats it only when the lights differ.
// Its switch and its dark strip already say that it is off, and the room's lock note that the
// whole room is in use. A state reads as the rest of the app writes it (D56).
function lightNote(light: Light, hasOneLook: boolean, isRoomLocked: boolean) {
  if (!light.isOnline) return "Isn't answering";
  if (light.isLockedByOther) return isRoomLocked ? '' : 'In use';
  if (!light.isOn || hasOneLook) return '';
  return lookNameOf(light) ?? '';
}

function allLightsWord({ writableLights }: Room) {
  return writableLights.length === 2 ? 'BOTH' : 'ALL';
}

function ChooseAllKey({ room, chosen }: { room: Room; chosen: Light[] }) {
  const { writableLights } = room;
  const first = writableLights[0];
  if (!first || writableLights.length < 2) return null;
  const isAll = chosen.length === writableLights.length;
  const word = allLightsWord(room);
  return (
    <TextKey onClick={() => chooseLights(isAll ? [first.address] : [])}>
      {isAll ? `${word} CHOSEN` : `CHOOSE ${word}`}
    </TextKey>
  );
}

function LightCards({ room, chosen }: { room: Room; chosen: Light[] }) {
  const lights = useShownLights(room.lights);
  const hasPowers = lights.length > 1;
  const hasOneLook = hasOneLookName(lights.filter(({ isOnline }) => isOnline));
  return (
    <RoomSection eyebrow="LIGHTS" action={<ChooseAllKey room={room} chosen={chosen} />}>
      {lights.map((light) => {
        const canChange = light.isOnline && !light.isLockedByOther;
        return (
          <LightCard
            key={light.address}
            name={light.name}
            note={lightNote(light, hasOneLook, room.isLocked)}
            isChosen={chosen.some(({ address }) => address === light.address)}
            disabled={!canChange}
            strip={
              <LookStrip
                source={previewOfAnimation(light.animation)}
                shape="room"
                isOn={light.isOnline && light.isOn}
                brightness={light.brightness}
              />
            }
            power={
              hasPowers &&
              light.isOnline && (
                <PowerKey
                  label={`${light.name} power`}
                  isOn={light.isOn}
                  disabled={!canChange}
                  onChange={(next) => setPower([light], next)}
                />
              )
            }
            onChoose={() => chooseLight(light.address, room.writableLights)}
            onHold={() => flashLights([light])}
          />
        );
      })}
    </RoomSection>
  );
}

function lookTitle(lights: Light[]) {
  if (!hasOneLookName(lights)) return 'Mixed';
  const name = lookNameOf(lights[0]) ?? '';
  return isMixedLook(lights) || editedLook(lights[0]) ? `${name}, changed` : name;
}

function offNote(lights: Light[]) {
  const first = lights[0];
  return lights.length === 1 && first ? `${first.name} is off.` : 'These lights are off.';
}

// Level shows here only when one light of several is chosen; the room level sits at the top.
function LookSettings({ room, lights, light }: { room: Room; lights: Light[]; light: Light }) {
  return (
    <>
      {lights.length === 1 && room.writableLights.length > 1 && (
        <SliderRow
          label="Level"
          valueText={String(Math.round(light.brightness * PERCENT))}
          value={light.brightness}
          min={0}
          max={1}
          step={0.01}
          onChange={(next) => setBrightness(lights, next)}
        />
      )}
      <LookControls lights={lights} />
    </>
  );
}

function LookPanel({ room, lights }: { room: Room; lights: Light[] }) {
  const shownLights = useShownLights(lights);
  const isMixed = isMixedLook(shownLights);
  const canChange = !isMixed && isAnyOn(shownLights);
  const edited = isMixed ? undefined : editedLook(lights[0]);
  const light = lights[0];
  if (!light) return null;
  const reset = () => edited && playLook(lights, edited.name, { type: 'patch', params: edited.document });
  return (
    <RoomSection>
      <LookHeading
        name={lookTitle(shownLights)}
        onReset={edited ? reset : undefined}
        onEdit={canChange ? () => openPage('editor', room.id) : undefined}
        onLooks={() => openPage('looks', room.id)}
      />
      <FavouriteLookRow lights={lights} />
      {isMixed && <QuietNote>Choose a light to change its settings.</QuietNote>}
      {!isMixed && !canChange && <QuietNote>{offNote(lights)}</QuietNote>}
      {canChange && <LookSettings room={room} lights={lights} light={light} />}
    </RoomSection>
  );
}

function RoomMore({ room }: { room: Room }) {
  const [isTiming, setTiming] = useState(false);
  const timerLights = schedulingLights(room);
  return (
    <RoomSection>
      {timerLights.length > 0 && (
        <MoreRow label="Off timer" note={offTimerNote(timerLights)} onOpen={() => setTiming(true)} />
      )}
      <MoreRow label="Room settings" onOpen={() => openPage('room-settings', room.id)} />
      {isTiming && <OffTimerSheet room={room} onClose={() => setTiming(false)} />}
    </RoomSection>
  );
}

export function RoomScreen({ room, rooms }: { room: Room; rooms: Room[] }) {
  const chosenAddresses = useNavigation((navigation) => navigation.chosenAddresses);
  const chosen = lightsInScope(room, chosenAddresses);
  const shownLights = useShownLights(room.onlineLights);
  const { writableLights } = room;
  const isOn = isAnyOn(shownLights);
  const isReadOnly = writableLights.length === 0;
  return (
    <RoomLayout
      name={room.name}
      power={
        <PowerKey
          label={`${room.name} power`}
          isOn={isOn}
          disabled={isReadOnly}
          onChange={(next) => setPower(writableLights, next)}
        />
      }
      backLabel="Rooms"
      onBack={closeRoom}
    >
      <LevelRow
        label={room.name}
        isOn={isOn}
        level={highestBrightness(shownLights)}
        disabled={isReadOnly || !isOn}
        onLevel={(next) => setBrightness(writableLights, next)}
      />
      {room.isLocked && <RoomLockNote room={room} />}
      <SceneRow rooms={rooms} room={room} />
      <LightCards room={room} chosen={chosen} />
      <LookPanel room={room} lights={chosen} />
      <RoomMore room={room} />
    </RoomLayout>
  );
}
