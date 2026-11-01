import type { AnimationState } from '../light-network/protocol';
import { applyState, type Light } from './fleet-store';
import { lightIdOf, type Scene, type SceneLight } from './library-store';
import { canPlay, lookNameOf, type Room } from './rooms';

export const WHOLE_HOUSE = 'house';

export const animationOf = ({ animation }: SceneLight): AnimationState => ({ params: {}, ...animation });

const captureLight = (light: Light, room: string): SceneLight[] => {
  const { name, isOn: is_on, brightness, animation } = light;
  return animation ? [{ id: lightIdOf(light), name, room, is_on, brightness, animation }] : [];
};

// A light that cannot say what it shows is left out. A guess would change it when the scene runs.
export function captureScene(name: string, rooms: Room[], scope: string): Scene {
  const covered = rooms.filter((room) => scope === WHOLE_HOUSE || room.id === scope);
  const lights = covered.flatMap((room) => room.onlineLights.flatMap((light) => captureLight(light, room.id)));
  return { name, lights };
}

export const sceneLookName = (light: Light, animation: AnimationState) =>
  lookNameOf({ ...light, animation, appliedLook: undefined }) ?? undefined;

// A light that cannot play the look keeps its own, and still follows the power and the level.
function applyToLight(light: Light, saved: SceneLight) {
  const animation = animationOf(saved);
  const canShow = canPlay(light, animation);
  applyState([light], {
    isOn: saved.is_on,
    brightness: saved.brightness,
    lookName: canShow ? sceneLookName(light, animation) : undefined,
    animation: canShow ? animation : null,
  });
}

// Says which lights the scene had to leave alone, because nobody can reach them or someone holds them.
export function applyScene(scene: Scene, rooms: Room[]) {
  const writable = rooms.flatMap((room) => room.writableLights);
  const leftOut: string[] = [];
  for (const saved of scene.lights) {
    const light = writable.find((candidate) => lightIdOf(candidate) === saved.id);
    if (light) applyToLight(light, saved);
    else leftOut.push(saved.name);
  }
  return leftOut;
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export const lightCount = (count: number) => plural(count, 'light');

// A scene belongs to the room that holds all of its lights now, so it follows a light that moves.
export function roomOfScene({ lights }: Pick<Scene, 'lights'>, rooms: Room[]) {
  if (rooms.length < 2 || lights.length === 0) return undefined;
  return rooms.find((room) => lights.every(({ id }) => room.lights.some((light) => lightIdOf(light) === id)));
}

export function sceneSummary({ lights }: Pick<Scene, 'lights'>, rooms: Room[]) {
  const covered = new Set(lights.map(({ room }) => room));
  const offCount = lights.filter(({ is_on: isOn }) => !isOn).length;
  const [only] = covered;
  if (lights.length === 0) return 'No light has a look to save yet';
  if (covered.size === 1 && rooms.length > 1) return `${roomNameOf(only ?? '', rooms)} only`;
  if (offCount === lights.length) return 'Turns everything off';
  if (offCount === 0) return 'All lights on';
  return `Turns ${lightCount(offCount)} off`;
}

export const roomNameOf = (id: string, rooms: Room[]) => rooms.find((room) => room.id === id)?.name ?? id;

export const roomTag = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
