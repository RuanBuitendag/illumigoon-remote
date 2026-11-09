import { switchPower, type Light } from './fleet-store';
import type { Room } from './rooms';
import { lightCount } from './scenes';
import { momentsOf, offerUndo } from './undo';

// The lights the last "all off" turned off, so "all on" brings back those and no others. It lasts
// as long as the app is open.
let wereOn: string[] = [];

function lightsToTurnOn(lights: Light[]) {
  const back = lights.filter(({ address }) => wereOn.includes(address));
  return back.length > 0 ? back : lights;
}

function lockedOnText(rooms: Room[]) {
  const lights = rooms.flatMap(({ onlineLights }) => onlineLights);
  const locked = lights.filter(({ isLockedByOther, isOn }) => isLockedByOther && isOn);
  if (locked.length === 0) return '';
  const verb = locked.length === 1 ? 'stays on, it is' : 'stay on, they are';
  return ` ${locked.map(({ name }) => name).join(', ')} ${verb} locked.`;
}

export function setHousePower(rooms: Room[], isOn: boolean) {
  const lights = rooms.flatMap(({ writableLights }) => writableLights);
  const changed = isOn ? lightsToTurnOn(lights) : lights.filter((light) => light.isOn);
  const count = lightCount(changed.length);
  wereOn = isOn ? [] : changed.map(({ address }) => address);
  offerUndo({ text: isOn ? `${count} on` : `${count} off.${lockedOnText(rooms)}`, moments: momentsOf(changed) });
  switchPower(changed, isOn);
}
