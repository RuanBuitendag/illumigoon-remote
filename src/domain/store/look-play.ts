import type { AnimationState } from '../light-network/protocol';
import { NEW_LOOK } from '../looks/looks';
import { openPage, setScope } from './navigation-store';

const NEW_LOOK_NAME = 'New look';
import { applyLook, noteLook, noteState, setPower, type Light } from './fleet-store';
import { rememberRecentLook, useHousehold } from './household-store';
import { useLibrary } from './library-store';
import { cancelWaiting, gapOf, laterOn } from './light-timing';
import { saveLook, useLookFiles } from './look-files';
import { editedLook, isSameAnimation, lookNameOf, OWN_LOOK } from './rooms';
import { momentsOf, offerUndo, showNotice } from './undo';

// A look written to a light that is off can replace the one it has saved when the light is short of
// memory. So that light comes on first, and takes the look a gap later. The screen shows it at once.
function wakeThenPlay(light: Light, name: string, animation: AnimationState) {
  setPower([light], true);
  noteLook(light.address, name, animation);
  laterOn(light.address, gapOf(light), () => applyLook([light], name, animation));
}

// A new look starts on the lights from the starter, and the editor opens on the room of the first
// light that answers. Only lights that are on and online can be edited, so the rest only play it.
export function startNewLook(lights: Light[]) {
  const editable = lights.filter(({ isOnline, isOn }) => isOnline && isOn);
  const [first] = editable;
  if (!first) return false;
  playLook(editable, NEW_LOOK_NAME, NEW_LOOK);
  setScope(editable.length === 1 ? first.address : null);
  openPage('editor', first.roomId);
  return true;
}

// The look a room leaves stays in Recent as the lights had it, changes and all, so a tap brings
// that back and not the version it started from. Its place and its count do not change.
function keepChangesInRecent(lights: Light[]) {
  const recentLooks = { ...useHousehold.getState().recentLooks };
  for (const roomId of new Set(lights.map((light) => light.roomId))) {
    const first = lights.find((light) => light.roomId === roomId && light.animation);
    const name = lookNameOf(first);
    const animation = first?.animation;
    if (!roomId || !name || !animation) continue;
    recentLooks[roomId] = (recentLooks[roomId] ?? []).map((look) => (look.name === name ? { name, animation } : look));
  }
  useHousehold.setState({ recentLooks });
}

// The one way a tap puts a look on lights.
export function playLook(lights: Light[], name: string, animation: AnimationState) {
  offerUndo({ text: `Playing ${name}`, moments: momentsOf(lights) });
  keepChangesInRecent(lights);
  for (const roomId of new Set(lights.map((light) => light.roomId))) {
    rememberRecentLook(roomId, { name, animation });
  }
  for (const light of lights) {
    cancelWaiting(light.address);
    if (light.isOn) applyLook([light], name, animation);
    else wakeThenPlay(light, name, animation);
  }
}

// The saved look a light's look came from, or the name it goes by when it came from none.
function originOf(light: Light) {
  const name = editedLook(light)?.name ?? lookNameOf(light);
  return name && name !== OWN_LOOK ? name : undefined;
}

// A name for a copy that no look in Mine has yet: "My Candle", or "Bright Candle 2" for an own look.
export function suggestedLookName(light: Light | undefined) {
  const origin = light && originOf(light);
  if (!origin) return '';
  const taken = new Set(useLookFiles.getState().mine.map(({ name }) => name.toLowerCase()));
  const stem = taken.has(origin.toLowerCase()) ? origin : `My ${origin}`;
  let candidate = stem;
  for (let number = 2; taken.has(candidate.toLowerCase()); number++) candidate = `${stem} ${number}`;
  return candidate;
}

// SAVE AS NEW: the look on the lights becomes a file in Mine, and the lights go by its name from now.
// The look is the one a light that is on shows, and only lights that show that same look take its name.
export async function saveAsNewLook(lights: Light[], name: string) {
  const light = lights.find(({ isOn, animation }) => isOn && animation) ?? lights.find(({ animation }) => animation);
  const animation = light?.animation;
  if (!light || !animation) return;
  const origin = originOf(light);
  await saveLook(name, animation, origin ? `Your version of ${origin}.` : '');
  if (useLibrary.getState().problem !== null) return;
  for (const shown of lights) {
    if (isSameAnimation(shown.animation, animation)) noteState(shown, { isOn: shown.isOn, lookName: name, animation });
  }
  showNotice(`${name} is in Mine`);
}
