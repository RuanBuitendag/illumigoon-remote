import type { AnimationState } from '../light-network/protocol';
import { applyLook, noteLook, type Light } from './fleet-store';
import { gapOf } from './look-preview';
import { canPlay } from './rooms';

// One at a time, so a light never gets a second look before it can take it.
export function sendInTurn(lights: Light[], lookName: string, look: AnimationState) {
  let sendAt = 0;
  for (const light of lights) {
    window.setTimeout(() => applyLook([light], lookName, look), sendAt);
    sendAt += gapOf(light);
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
