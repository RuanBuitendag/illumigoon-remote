import type { AnimationState } from '../light-network/protocol';
import { applyLook, noteLook, setPower, type Light } from './fleet-store';
import { rememberRecentLook } from './household-store';
import { cancelWaiting, gapOf, laterOn } from './light-timing';
import { momentsOf, offerUndo } from './undo';

// A look written to a light that is off can replace the one it has saved when the light is short of
// memory. So that light comes on first, and takes the look a gap later. The screen shows it at once.
function wakeThenPlay(light: Light, name: string, animation: AnimationState) {
  setPower([light], true);
  noteLook(light.address, name, animation);
  laterOn(light.address, gapOf(light), () => applyLook([light], name, animation));
}

// The one way a tap puts a look on lights.
export function playLook(lights: Light[], name: string, animation: AnimationState) {
  offerUndo({ text: `Playing ${name}`, moments: momentsOf(lights) });
  for (const roomId of new Set(lights.map((light) => light.roomId))) {
    rememberRecentLook(roomId, { name, animation });
  }
  for (const light of lights) {
    cancelWaiting(light.address);
    if (light.isOn) applyLook([light], name, animation);
    else wakeThenPlay(light, name, animation);
  }
}
