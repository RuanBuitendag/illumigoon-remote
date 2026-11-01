import { create } from 'zustand';
import type { AnimationState } from '../light-network/protocol';
import { withPositions } from '../looks/looks';
import { isBeforeVersion } from './firmware-versions';
import {
  appliedLookOf,
  lightIdOf,
  restoreLight,
  useFleet,
  writeHold,
  type Light,
  type LightArrival,
  type LightHoldState,
} from './fleet-store';
import type { Scene, SceneLight } from './library-store';
import { useNavigation } from './navigation-store';
import { canPlay, type Room } from './rooms';
import { animationOf, sceneLookName } from './scenes';

// Hold a look and the lights show it until the finger lifts. Firmware before this version can run
// out of memory and restart when a long look replaces a long look. A light also saves its look a
// second after each change, so a hold is two look changes at most and never repeats itself.
const FIRST_SAFE_VERSION = '1.2.454';
const LONG_LOOK_BYTES = 3400;
const GAP_MS = 1500;
const OLDER_GAP_MS = 4000;
const ARRIVAL: LightArrival = { ms: 300 };
const LONGEST_HOLD_MS = 15000;

const isOlder = ({ softwareVersion }: Light) => isBeforeVersion(softwareVersion, FIRST_SAFE_VERSION);
export const gapOf = (light: Light) => (isOlder(light) ? OLDER_GAP_MS : GAP_MS);
const isLong = (look: AnimationState | null) =>
  look !== null && JSON.stringify(withPositions(look)).length >= LONG_LOOK_BYTES;
const isSameLook = (first: AnimationState | null, second: AnimationState) =>
  JSON.stringify(first) === JSON.stringify(second);

// A hold in the gap of an earlier one finds its look still on the light, not the one in the store.
const lookOnLight = ({ hold, animation }: Light) => (hold && !hold.isRestoreDue && hold.animation) || animation;

// `never` leaves the light as it is. `keep` means the look is there already, so only power and level can change.
type PreviewAction = 'look' | 'keep' | 'never';

export type PreviewStep = { light: Light; action: PreviewAction; sendAt: number };

// A light short of memory holds no copy of its look while off, only the saved one, so a look sent
// to a light that is off can replace that saved look for good. An off light sits a hold out.
function actionFor(light: Light, look: AnimationState): PreviewAction {
  if (!light.isOn) return 'never';
  const current = lookOnLight(light);
  if (isSameLook(current, look)) return 'keep';
  return isOlder(light) && isLong(current) && isLong(look) ? 'never' : 'look';
}

// A light that cannot say what it shows is left out, because nothing could put it back.
export function previewPlan(lights: Light[], look: AnimationState, now: number): PreviewStep[] {
  const able = lights.filter(
    (light) => light.isOnline && !light.isLockedByOther && light.animation !== null && canPlay(light, look),
  );
  return able.map((light) => ({
    light,
    action: actionFor(light, look),
    sendAt: Math.max(now, light.lookWrittenAt + gapOf(light)),
  }));
}

type ShownLight = Pick<Light, 'isOn' | 'brightness' | 'animation' | 'appliedLook'>;

// `light.animation` does not change during a hold. This is what the screens draw meanwhile.
const usePreview = create<{ shown: Record<string, ShownLight> }>(() => ({ shown: {} }));

export function useShownLights(lights: Light[]) {
  const shown = usePreview((preview) => preview.shown);
  return lights.map((light) => ({ ...light, ...shown[light.address] }));
}

type PreviewTarget = LightHoldState & { lookName?: string };

type PlannedLight = PreviewStep & { target: PreviewTarget };

type Session = { addresses: string[]; timers: number[]; stopWatching: () => void };

let session: Session | null = null;
const restoreTimers = new Map<string, number>();

function changesLight({ light, action, target: { isOn, brightness } }: PlannedLight) {
  if (action === 'never') return false;
  return action === 'look' || isOn !== light.isOn || (brightness ?? light.brightness) !== light.brightness;
}

function carryOut(planned: PlannedLight, timers: number[]) {
  if (!changesLight(planned)) return;
  const { light, action, sendAt, target } = planned;
  const animation = action === 'look' ? target.animation : undefined;
  const arrival = isOlder(light) ? undefined : ARRIVAL;
  const send = () => writeHold(light, { ...target, animation }, arrival);
  const wait = animation ? sendAt - Date.now() : 0;
  if (wait > 0) timers.push(window.setTimeout(send, wait));
  else send();
}

// A light that sits a hold out keeps its power and level on screen too.
function shownBy({ light, action, target }: PlannedLight): ShownLight {
  const { isOn, brightness, animation, lookName } = target;
  const isChanged = action !== 'never';
  return {
    isOn: isChanged ? isOn : light.isOn,
    brightness: (isChanged ? brightness : undefined) ?? light.brightness,
    animation: animation ?? light.animation,
    appliedLook: animation && lookName ? appliedLookOf(lookName, animation) : light.appliedLook,
  };
}

function restoreWhenAllowed(light: Light) {
  const { address, hold, lookWrittenAt } = light;
  const wait = hold?.animation ? lookWrittenAt + gapOf(light) - Date.now() : 0;
  if (wait <= 0) restoreLight(address);
  else restoreTimers.set(address, window.setTimeout(() => restoreLight(address), wait));
}

export function endPreview() {
  if (!session) return;
  const { addresses, timers, stopWatching } = session;
  session = null;
  stopWatching();
  for (const timer of timers) window.clearTimeout(timer);
  usePreview.setState({ shown: {} });
  const { lights } = useFleet.getState();
  for (const address of addresses) {
    const light = lights[address];
    if (light?.hold) restoreWhenAllowed(light);
  }
}

// The finger's own end is not the only end: a page can go away with the finger still down.
function watchForEnd() {
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') endPreview();
  };
  const limit = window.setTimeout(endPreview, LONGEST_HOLD_MS);
  const stopNavigation = useNavigation.subscribe(() => endPreview());
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', endPreview);
  return () => {
    window.clearTimeout(limit);
    stopNavigation();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', endPreview);
  };
}

function startPreview(lights: PlannedLight[]) {
  endPreview();
  const timers: number[] = [];
  const addresses = lights.map(({ light }) => light.address);
  for (const address of addresses) {
    window.clearTimeout(restoreTimers.get(address));
    restoreTimers.delete(address);
  }
  session = { addresses, timers, stopWatching: watchForEnd() };
  usePreview.setState({
    shown: Object.fromEntries(lights.map((planned) => [planned.light.address, shownBy(planned)])),
  });
  for (const planned of lights) carryOut(planned, timers);
}

export function previewLook(lights: Light[], lookName: string, look: AnimationState) {
  const target = { isOn: true, animation: look, lookName };
  startPreview(previewPlan(lights, look, Date.now()).map((step) => ({ ...step, target })));
}

// A saved light that is off, or that cannot play the look, keeps its look and follows the power and level.
function planSceneLight(light: Light, saved: SceneLight, now: number): PlannedLight[] {
  const current = lookOnLight(light);
  if (!current) return [];
  const animation = animationOf(saved);
  const showsLook = saved.is_on && canPlay(light, animation);
  const steps = previewPlan([light], showsLook ? animation : current, now);
  return steps.map((step) => ({
    ...step,
    target: {
      isOn: saved.is_on,
      brightness: saved.brightness,
      animation: showsLook ? animation : undefined,
      lookName: showsLook ? sceneLookName(light, animation) : undefined,
    },
  }));
}

export function previewScene({ lights }: Scene, rooms: Room[]) {
  const writable = rooms.flatMap((room) => room.writableLights);
  const now = Date.now();
  startPreview(
    lights.flatMap((saved) => {
      const light = writable.find((candidate) => lightIdOf(candidate) === saved.id);
      return light ? planSceneLight(light, saved, now) : [];
    }),
  );
}
