import { Fragment } from 'react';
import { LevelSlider } from '../components/level-slider';
import { LookControl } from '../components/look-control';
import { PowerSwitch } from '../components/power-switch';
import type { Parameter } from '../light-network/protocol';
import { applyLook, setBrightness, setParameter, setPower } from '../store/fleet-store';
import {
  currentControls,
  currentLookName,
  defaultParams,
  flatLooks,
  isRoomOn,
  lightsWithLook,
  patchLights,
  patchLooks,
  roomBrightness,
  type Room,
} from '../store/rooms';

function LookTile({ name, isCurrent, onPick }: { name: string; isCurrent: boolean; onPick: () => void }) {
  return (
    <button type="button" className="look-tile" aria-pressed={isCurrent} onClick={onPick}>
      {name}
    </button>
  );
}

function Looks({ room }: { room: Room }) {
  const current = currentLookName(room);
  return (
    <div className="look-grid">
      {flatLooks(room).map((manifest) => (
        <LookTile
          key={manifest.id}
          name={manifest.name}
          isCurrent={current === manifest.name}
          onPick={() =>
            applyLook(lightsWithLook(room, manifest.id), manifest.name, {
              type: manifest.id,
              params: defaultParams(manifest),
            })
          }
        />
      ))}
      {patchLooks(room).map((look) => (
        <LookTile
          key={look.id}
          name={look.name}
          isCurrent={current === look.name}
          onPick={() => applyLook(patchLights(room), look.name, { type: 'patch', params: look.document })}
        />
      ))}
    </div>
  );
}

function groupControls(controls: Parameter[]) {
  const groups = new Map<string, Parameter[]>();
  for (const control of controls) {
    const group = control.group ?? '';
    groups.set(group, [...(groups.get(group) ?? []), control]);
  }
  return [...groups];
}

function Controls({ room }: { room: Room }) {
  const controls = currentControls(room);
  if (controls.length === 0) return null;
  return (
    <section>
      <h2>{currentLookName(room)}</h2>
      {groupControls(controls).map(([group, parameters]) => (
        <Fragment key={group}>
          {group && <h3>{group}</h3>}
          {parameters.map((parameter) => (
            <LookControl
              key={parameter.key}
              parameter={parameter}
              onChange={(value) => setParameter(room.writableLights, parameter.key, value)}
            />
          ))}
        </Fragment>
      ))}
    </section>
  );
}

function LightRows({ room }: { room: Room }) {
  if (room.lights.length < 2) return null;
  return (
    <section>
      <h2>Lights</h2>
      {room.lights.map((light) => (
        <div className="row light-row" key={light.address}>
          <span>{light.name}</span>
          <PowerSwitch
            label={`${light.name} power`}
            checked={light.isOn}
            disabled={light.isLockedByOther}
            onChange={(isOn) => setPower([light], isOn)}
          />
        </div>
      ))}
    </section>
  );
}

export function RoomScreen({ room, onBack }: { room: Room; onBack: () => void }) {
  return (
    <main>
      <button type="button" className="back" onClick={onBack}>
        Rooms
      </button>
      <div className="row">
        <h1>{room.id || 'No room'}</h1>
        <PowerSwitch
          label="Room power"
          checked={isRoomOn(room)}
          onChange={(isOn) => setPower(room.writableLights, isOn)}
        />
      </div>
      <LevelSlider
        label="Room brightness"
        value={roomBrightness(room)}
        min={0}
        max={1}
        step={0.01}
        onChange={(brightness) => setBrightness(room.writableLights, brightness)}
      />
      <Controls room={room} />
      <section>
        <h2>Looks</h2>
        <Looks room={room} />
      </section>
      <LightRows room={room} />
    </main>
  );
}
