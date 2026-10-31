import type { ParameterValue } from '../light-network/protocol';
import { latestDocumentOf } from '../looks/look-catalog';
import { applyLook, setParameter, withParameter, type Light } from './fleet-store';
import { lookNameOf } from './rooms';

// The first change to an older copy of a look sends the whole new copy, with the change in it.
function sendLatestCopy(light: Light, key: string, value: ParameterValue) {
  if (light.animation?.type !== 'patch') return false;
  const document = latestDocumentOf(light.animation.params);
  if (!document) return false;
  const animation = withParameter({ type: 'patch', params: document }, key, value);
  applyLook([light], lookNameOf(light) ?? '', animation);
  return true;
}

export function changeControl(lights: Light[], key: string, value: ParameterValue) {
  const upToDate = lights.filter((light) => !sendLatestCopy(light, key, value));
  setParameter(upToDate, key, value);
}
