import type { AnimationState, Parameter } from '../light-network/protocol';
import newLook from './new-look.json';

export type PatchLook = { id: string; name: string; document: Record<string, unknown> };

type PatchFile = Record<string, unknown> & { name?: string };

const patchFiles = import.meta.glob<PatchFile>('./patches/*.json', { eager: true, import: 'default' });

function toLook([path, file]: [string, PatchFile]): PatchLook {
  const id = path.replace(/^.*\/|\.json$/g, '');
  const { name, created: _created, notes: _notes, ...document } = file;
  return { id, name: name ?? id, document };
}

export const PATCH_LOOKS = Object.entries(patchFiles)
  .map(toLook)
  .sort((a, b) => a.name.localeCompare(b.name));

// What NEW LOOK puts on the strip: one slow layer, so the editor opens on something to change.
export const NEW_LOOK: AnimationState = { type: 'patch', params: newLook };

// The modulators that hear the microphone. The patch says so itself, so no list of looks can go stale.
const LISTENING_MODULATORS = new Set(['audio_band', 'tempo', 'beat']);

export function listensToMusic(animation: AnimationState | null) {
  if (animation?.type !== 'patch') return false;
  const modulators = Object.values((animation.params.modulators ?? {}) as Record<string, { type?: string }>);
  return modulators.some(({ type }) => LISTENING_MODULATORS.has(type ?? ''));
}

// A patch starts at the positions it was authored with, because nothing reads `default`. A moved
// control therefore goes in beside the document, both to a light and to the preview engine.
export function withPositions(animation: AnimationState): AnimationState {
  if (animation.type !== 'patch') return animation;
  const surface = (animation.params.surface as Parameter[] | undefined) ?? [];
  const values = Object.fromEntries(surface.map(({ key, default: position }) => [key, position]));
  return { ...animation, values };
}
