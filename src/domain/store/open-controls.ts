import type { Parameter } from '../light-network/protocol';
import { newerCopyOf } from '../looks/look-catalog';
import { applyLook, type Light } from './fleet-store';
import { setSheetOpen } from './navigation-store';
import { lookNameOf } from './rooms';

const surfaceOf = (document: Record<string, unknown>) => (document.surface as Parameter[] | undefined) ?? [];

function keepPositions(document: Record<string, unknown>, older: Record<string, unknown>) {
  const positions = new Map(surfaceOf(older).map((control) => [`${control.key}:${control.type}`, control.default]));
  const surface = surfaceOf(document).map((control) => {
    const position = positions.get(`${control.key}:${control.type}`);
    return position === undefined ? control : { ...control, default: position };
  });
  return { ...document, surface };
}

function bringUpToDate(light: Light) {
  if (light.animation?.type !== 'patch') return;
  const { params } = light.animation;
  const look = newerCopyOf(params);
  if (!look) return;
  const animation = { type: 'patch', params: keepPositions(look.document, params) };
  applyLook([light], lookNameOf(light) ?? look.name, animation);
}

export function openControls(lights: Light[]) {
  lights.forEach(bringUpToDate);
  setSheetOpen(true);
}
