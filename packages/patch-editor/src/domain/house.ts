/** The shapes a light's look and a saved Scene take, and what a preset file sends to a light. */

/** What a light is running, exactly as `light_state_res` carries it. */
export interface Animation {
  type: string;
  params?: any;
}

/**
 * Keys a preset file carries that are the file's, not the patch's, and are left behind when one
 * is sent to a light.
 *
 * `name` USED to be one of them, and was removed from this list when `PatchDoc::load` learned to
 * read it. A light had no use for a name before -- it dropped the key on load and never wrote one
 * back -- so sending it was bytes of NVS spent on something nothing could read. Now it is the only
 * way a light can say which patch it is showing, and stripping it here is what kept every patch
 * reporting itself as the bare animation `patch`.
 *
 * `created` and `notes` stay behind. `created` is a fact about the file. `notes` is prose, and the
 * gallery's run to several hundred characters against a document budget that some of those
 * documents are already close to.
 */
const FILE_ONLY = ['created', 'notes'];

/** A preset file as the document a light is sent — the file's own labels left behind. */
export function documentOf(preset: Record<string, any>): Record<string, any> {
  const doc: Record<string, any> = {};
  for (const [k, v] of Object.entries(preset ?? {})) if (!FILE_ONLY.includes(k)) doc[k] = v;
  return doc;
}

const AUDIO_SOURCES = new Set(['audio_band', 'tempo', 'beat']);

/** Whether a document listens to the microphone. Its frames are then frames of silence. */
export const usesAudio = (doc: Record<string, any>): boolean =>
  Object.values(doc?.modulators ?? {}).some((m: any) => AUDIO_SOURCES.has(m?.type));

export interface SceneLight {
  id: string;
  name: string;
  room: string | null;
  is_on: boolean;
  brightness: number;
  animation: Animation;
}

export interface Scene {
  name: string;
  created?: string;
  lights: SceneLight[];
}
