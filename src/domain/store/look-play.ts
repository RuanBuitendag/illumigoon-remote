import type { AnimationState } from '../light-network/protocol';
import { applyLook, noteLook, setPower, type Light } from './fleet-store';
import { cancelWaiting, laterOn } from './light-timing';
import { gapOf } from './look-preview';

// A look written to a light that is off can replace the one it has saved when the light is short of
// memory. So that light comes on first, and takes the look a gap later. The screen shows it at once.
function wakeThenPlay(light: Light, name: string, animation: AnimationState) {
  setPower([light], true);
  noteLook(light.address, name, animation);
  laterOn(light.address, gapOf(light), () => applyLook([light], name, animation));
}

// The one way a tap puts a look on lights.
export function playLook(lights: Light[], name: string, animation: AnimationState) {
  for (const light of lights) {
    cancelWaiting(light.address);
    if (light.isOn) applyLook([light], name, animation);
    else wakeThenPlay(light, name, animation);
  }
}
