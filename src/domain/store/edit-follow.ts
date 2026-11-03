import type { AnimationState } from '../light-network/protocol';
import { applyLook, noteLook, type Light } from './fleet-store';
import { gapOf, laterOn } from './light-timing';
import { canPlay } from './rooms';

// Each light waits only for its own last look, so it never gets a second look before it can take it,
// and the others in the room do not wait in a line behind it.
export function sendInTurn(lights: Light[], lookName: string, look: AnimationState) {
  for (const light of lights) {
    const wait = Math.max(0, light.lookWrittenAt + gapOf(light) - Date.now());
    laterOn(light.address, wait, () => applyLook([light], lookName, look));
  }
}

// Edit works on one light, so with more in scope the room would be left mixed. A person sees the
// others follow after they leave. A light that is off sits this out: nothing asked it to come on,
// and a look sent to it can replace the one it has saved.
export function finishEdit(edited: string, scope: Light[], lookName: string, look: AnimationState) {
  noteLook(edited, lookName, look);
  const others = scope.filter(
    (light) => light.address !== edited && light.isOnline && light.isOn && canPlay(light, look),
  );
  sendInTurn(others, lookName, look);
}
