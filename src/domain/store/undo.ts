import { create } from 'zustand';
import { UNDO_SECONDS } from '../../design-system';
import type { AnimationState } from '../light-network/protocol';
import { applyState, noteState, setPower, useFleet, type Light } from './fleet-store';
import { cancelWaiting, gapOf, laterOn } from './light-timing';
import { lookNameOf } from './rooms';

// What one light was doing before a change.
export type LightMoment = {
  address: string;
  isOn: boolean;
  brightness: number;
  lookName: string | undefined;
  animation: AnimationState | null;
};

type Offer = {
  text: string;
  moments: LightMoment[];
  // A look from Edit that has no file yet, so the notice can still keep it.
  unsaved?: { name: string; animation: AnimationState };
  // A change to a saved thing, not to a light.
  restore?: () => void;
  // Tells what happened, with nothing to put back.
  isNoteOnly?: boolean;
};

export const useUndo = create<{ offer: Offer | null }>(() => ({ offer: null }));

let timer = 0;

export const pauseUndo = () => window.clearTimeout(timer);

export function resumeUndo() {
  pauseUndo();
  timer = window.setTimeout(() => useUndo.setState({ offer: null }), UNDO_SECONDS * 1000);
}

export const momentsOf = (lights: Light[]): LightMoment[] =>
  lights.map((light) => {
    const { address, isOn, brightness, animation } = light;
    return { address, isOn, brightness, animation, lookName: lookNameOf(light) ?? undefined };
  });

export function offerUndo(offer: Offer) {
  if (offer.moments.length === 0 && !offer.restore) return;
  useUndo.setState({ offer });
  resumeUndo();
}

export function showNotice(text: string) {
  useUndo.setState({ offer: { text, moments: [], isNoteOnly: true } });
  resumeUndo();
}

export function markUndoSaved() {
  useUndo.setState(({ offer }) => ({ offer: offer && { ...offer, unsaved: undefined } }));
  resumeUndo();
}

const isSameLook = (first: AnimationState | null, second: AnimationState | null) =>
  JSON.stringify(first) === JSON.stringify(second);

// A look written to a light that is off can replace the one it has saved, so the look goes on while
// the light is on, and the light goes off a gap later, once it has stored that look.
function putLookBack(address: string, { isOn, brightness, lookName, animation }: LightMoment) {
  const light = useFleet.getState().lights[address];
  if (!light) return;
  applyState([light], { isOn: true, brightness, lookName, animation });
  if (!isOn) laterOn(address, gapOf(light), () => setPower([light], false));
}

function putBack(moment: LightMoment) {
  const { address, isOn, brightness, lookName, animation } = moment;
  const light = useFleet.getState().lights[address];
  if (!light?.isOnline || light.isLockedByOther) return;
  cancelWaiting(address);
  if (!animation || isSameLook(light.animation, animation)) {
    applyState([light], { isOn, brightness });
    return;
  }
  const wait = Math.max(0, light.lookWrittenAt + gapOf(light) - Date.now());
  if (!light.isOn) setPower([light], true);
  const delay = light.isOn ? wait : Math.max(wait, gapOf(light));
  if (delay === 0) {
    putLookBack(address, moment);
    return;
  }
  // The screen goes back now, and the light when it can take another look.
  noteState(light, { isOn, brightness, lookName, animation });
  laterOn(address, delay, () => putLookBack(address, moment));
}

export function undoChange() {
  const { offer } = useUndo.getState();
  pauseUndo();
  useUndo.setState({ offer: null });
  offer?.moments.forEach(putBack);
  offer?.restore?.();
}
