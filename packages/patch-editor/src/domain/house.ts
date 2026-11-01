/**
 * The house: every light the sidecar has found, what each one is showing, and the acts the
 * Connect screen offers over them — one patch onto chosen lights, a Scene, and a light's own
 * arrival (LIFE-863, LIFE-864).
 *
 * PURE. Nothing here opens a socket or reads a folder: `device/house.ts` delivers what this
 * plans and `library/scenes.ts` keeps what it captures. That split is what lets `check:house`
 * drive every rule below with no light and no sidecar.
 *
 * The rules are the Android app's, ported rather than reinvented (modulight-app requirements §4,
 * §5, ADRs 0001, 0010, 0021 and 0023):
 *
 *   - A capture is what this editor BELIEVES, not a fresh read. Power, brightness and the
 *     document come from the sidecar's last probe of each light.
 *   - A light that cannot be described is LEFT OUT AND COUNTED, never guessed. Recording a guess
 *     makes a Scene that changes a strip nobody touched.
 *   - Applying is ONE `light_set_state` per light — animation, brightness and power together. A
 *     light part-way through separate writes is showing something nobody chose.
 *   - Nothing is queued for a light that is not answering, and what could not be reached is said
 *     by name.
 *   - A delivery is `sent` or `unreachable`, never "succeeded": the protocol acknowledges no
 *     write. The next probe is the only confirmation there is.
 */

/** What a light is running, exactly as `light_state_res` carries it. */
export interface Animation {
  type: string;
  params?: any;
}

/**
 * A transition by name and length — what `light_set_transition` stores and `transition` carries.
 */
export interface ArrivalSpec {
  id: string;
  ms: number;
}

/** One row of `/api/devices`: the mDNS record, and what the probe heard from the light. */
export interface FoundDevice {
  name: string;
  host: string;
  port: number;
  addresses: string[];
  txt: Record<string, string>;
  probed?: boolean;
  device_name?: string | null;
  room_id?: string | null;
  is_master?: boolean;
  firmware_version?: string | null;
  is_on?: boolean | null;
  brightness?: number | null;
  locked_by?: string | null;
  /** When the probe last heard this light's own heartbeat, ms since epoch. */
  at?: number;
  /** What the light said it is running when its `state_hash` last moved. Null until pulled. */
  animation?: Animation | null;
  /** `trans_id` / `trans_ms` as the light's `device_config_get` answered. Absent until asked. */
  own_transition?: { id: string; ms: number | null } | null;
}

interface Transition { id: string; name: string }

/** The arrivals a light described in `light_manifests_res`, and what it does when told none. */
export interface Transitions {
  list: Transition[];
  defaultId: string | null;
  defaultMs: number | null;
}

export interface Light {
  /** The system MAC from the TXT record — what every write's envelope would name it by. */
  id: string;
  name: string;
  room: string | null;
  url: string;
  isOn: boolean | null;
  brightness: number | null;
  isMaster: boolean;
  firmware: string | null;
  /** Somebody holds a Lock, so this editor's writes are dropped. Reads still work. */
  locked: boolean;
  /** When the probe last heard it. Null: listed, but not heard from yet. */
  heardAt: number | null;
  /** How long it has been quiet, once that is long enough to call it silence. */
  silentFor: number | null;
  animation: Animation | null;
  /** The arrival this light uses for every change nobody names one for. Null: not known. */
  ownArrival: ArrivalSpec | null;
}

/**
 * How long a light may go unheard before it is called silent.
 *
 * The sidecar probes every 20 s, so this is two missed probes and some slack — one probe lost to
 * a busy httpd is not a light that has gone.
 */
const SILENT_AFTER_MS = 50_000;

/** `TRANSITION_MS_MIN` / `TRANSITION_MS_MAX` in `config.h`. The light clamps to these anyway. */
export const ARRIVAL_MS = { min: 0, max: 10_000, step: 100 } as const;

/** A light that can be written to now: heard from, and not gone quiet. */
export const selectable = (l: Light): boolean => l.heardAt !== null && l.silentFor === null;

/** A stored arrival the light actually has. A blank `trans_id` is a light nobody configured. */
function ownOf(d: FoundDevice): ArrivalSpec | null {
  const t = d.own_transition;
  return t && typeof t.id === 'string' && t.id && typeof t.ms === 'number'
    ? { id: t.id, ms: t.ms }
    : null;
}

function lightOf(d: FoundDevice, ip: string, now: number): Light {
  const heardAt = d.probed && typeof d.at === 'number' ? d.at : null;
  return {
    id: (d.txt?.id ?? '').toUpperCase() || d.name,
    name: d.device_name || d.name,
    room: d.room_id || null,
    url: `ws://${ip}${d.port && d.port !== 80 ? `:${d.port}` : ''}/ws`,
    isOn: d.is_on ?? null,
    brightness: d.brightness ?? null,
    isMaster: !!d.is_master,
    firmware: d.firmware_version ?? null,
    locked: !!d.locked_by,
    heardAt,
    silentFor: heardAt !== null && now - heardAt > SILENT_AFTER_MS ? now - heardAt : null,
    animation: d.animation ?? null,
    ownArrival: ownOf(d),
  };
}

/**
 * The sidecar's rows, as lights.
 *
 * ONE LIGHT, ONE ROW. A light advertises under both service names during the rename, and a
 * laptop on two interfaces hears it twice; both collapse on the TXT id, keeping whichever record
 * heard from it most recently.
 */
export function lightsOf(found: FoundDevice[], now: number): Light[] {
  const byId = new Map<string, Light>();
  for (const d of found) {
    const ip = d.addresses?.[0];
    if (!ip) continue;
    const light = lightOf(d, ip, now);
    const was = byId.get(light.id);
    if (!was || (light.heardAt ?? 0) > (was.heardAt ?? 0)) byId.set(light.id, light);
  }
  return [...byId.values()].sort((a, b) =>
    (a.room ?? '￿').localeCompare(b.room ?? '￿') || a.name.localeCompare(b.name));
}

export interface Room {
  /** Null for lights not in a room yet. */
  name: string | null;
  lights: Light[];
}

/** Grouped by room, in the order `lightsOf` sorted them: rooms by name, the roomless last. */
export function roomsOf(lights: Light[]): Room[] {
  const rooms: Room[] = [];
  for (const l of lights) {
    const last = rooms[rooms.length - 1];
    if (last && last.name === l.room) last.lights.push(l);
    else rooms.push({ name: l.room, lights: [l] });
  }
  return rooms;
}

// ------------------------------------------------------------------ choosing

export type Choice = 'all' | 'some' | 'none' | 'dead';

/** What a room's box shows: counted over the lights that can be chosen at all. */
export function roomChoice(room: Room, chosen: ReadonlySet<string>): Choice {
  const can = room.lights.filter(selectable);
  if (!can.length) return 'dead';
  const n = can.filter(l => chosen.has(l.id)).length;
  return n === 0 ? 'none' : n === can.length ? 'all' : 'some';
}

/** A room's box: everything answering in it, or nothing. A silent light is never added. */
export function toggleRoom(room: Room, chosen: ReadonlySet<string>): Set<string> {
  const next = new Set(chosen);
  const can = room.lights.filter(selectable);
  const all = can.length > 0 && can.every(l => chosen.has(l.id));
  for (const l of can) {
    if (all) next.delete(l.id);
    else next.add(l.id);
  }
  return next;
}

export function toggleLight(id: string, chosen: ReadonlySet<string>): Set<string> {
  const next = new Set(chosen);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// ------------------------------------------------------------------- arrival

/**
 * How a change arrives. Null is the light's own default, and is a state rather than a gap: an
 * absent `transition` is how the firmware is told to use what it has (ADR 0021).
 */
export type Arrival = ArrivalSpec | null;

/** The choice that sends no `transition` at all. */
export const OWN_ARRIVAL = 'own';

/**
 * A remembered choice, as a light is sent it.
 *
 * A name the lights have described otherwise is dropped for their own rather than sent: the
 * firmware would log it and use its default anyway, and the screen would be claiming an arrival
 * nobody gets. Before any light has described its transitions the choice is trusted as it is.
 */
export function arrivalOf(
  choice: { id: string; ms: number },
  transitions: Transitions | null,
): Arrival {
  if (choice.id === OWN_ARRIVAL) return null;
  if (transitions && !transitions.list.some(t => t.id === choice.id)) return null;
  return { id: choice.id, ms: choice.ms };
}

/**
 * What "the light's own" means across some lights: the one arrival they share, `mixed` when the
 * ones that said differ, or null when none has said.
 */
export function ownArrivalOf(lights: Light[]): ArrivalSpec | 'mixed' | null {
  const known = lights.map(l => l.ownArrival).filter((a): a is ArrivalSpec => a !== null);
  const first = known[0];
  if (!first) return null;
  return known.every(a => a.id === first.id && a.ms === first.ms) ? first : 'mixed';
}

// ------------------------------------------------------------------- sending

export interface Send {
  light: Light;
  type: string;
  payload: Record<string, unknown>;
}

export type Outcome = 'sent' | 'unreachable';

export interface Delivery {
  light: Light;
  outcome: Outcome;
}

/**
 * What the house screen needs from the device layer, and nothing more.
 *
 * Declared here rather than in `device/` because a component may not import the device
 * (`check:layers`). The composition root hands the screen an implementation.
 */
export interface HousePort {
  send(sends: Send[]): Promise<Delivery[]>;
  flash(light: Light): Promise<Delivery>;
}

/**
 * A few seconds of white breathing, then the light goes back to what it was.
 *
 * `light_identify` never persists and expires on its own, so a flash nobody renews needs no
 * second message to end it. White, breathing: of everything a strip might already be showing,
 * a slow white pulse is the least likely to be mistaken for the patch.
 */
export const FLASH = {
  type: 'light_identify',
  payload: { enable: true, color: { r: 255, g: 255, b: 255 }, effect: 'breathe', ttl_ms: 4000 },
} as const;

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

/**
 * One patch onto each chosen light.
 *
 * A SCENE CHANGE, NEVER AN EDIT. No `in_place`: that flag asks the light to keep the running
 * patch and update it, which is right for a knob and wrong for a new look — it would arrive
 * without the transition this message exists to carry. Power is left alone: a light that is off
 * takes the patch as the look it comes back on as.
 */
export function putPatch(preset: Record<string, any>, lights: Light[], arrival: Arrival): Send[] {
  const params = documentOf(preset);
  return lights.map(light => ({
    light,
    type: 'light_set_state',
    payload: { animation: { type: 'patch', params }, ...(arrival ? { transition: arrival } : {}) },
  }));
}

/**
 * Store an arrival ON the lights (`light_set_transition`), for every change nobody names one
 * for — an audio-reactive swap, the restore at boot, a phone that chose nothing.
 *
 * Both fields every time: a duration of 0 is a cut, not an absence, so leaving `ms` for the light
 * to keep would make a stored cut impossible to replace with the same id at a new length.
 */
export function makeOwnArrival(lights: Light[], arrival: ArrivalSpec): Send[] {
  return lights.map(light => ({
    light,
    type: 'light_set_transition',
    payload: { id: arrival.id, ms: arrival.ms },
  }));
}

// -------------------------------------------------------------------- scenes

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

/** `server/library.mjs` refuses more. A house with more lights than this is a different tool. */
const MAX_SCENE_LIGHTS = 64;

/**
 * The house as this editor believes it is, and the lights it could not describe.
 *
 * ASKS NOTHING. A re-read at the moment of saving could keep something the save row never
 * showed (ADR 0023); what the probe last heard is what the row showed.
 */
export function capture(name: string, lights: Light[]): { scene: Scene; unknown: Light[] } {
  const kept: SceneLight[] = [];
  const unknown: Light[] = [];
  for (const l of lights) {
    if (!selectable(l) || !l.animation || l.isOn === null || l.brightness === null) {
      unknown.push(l);
      continue;
    }
    kept.push({
      id: l.id, name: l.name, room: l.room,
      is_on: l.isOn, brightness: l.brightness, animation: l.animation,
    });
  }
  return { scene: { name: name.trim() || 'Untitled', lights: kept }, unknown };
}

/**
 * A Scene onto the house: one message per light it names, and the ones it could not find.
 *
 * Matched on the MAC, not the name — two lights in this house are both called "Left". A light
 * that is present but silent counts as missing: nothing is queued for it.
 */
export function applyScene(
  scene: Scene,
  lights: Light[],
  arrival: Arrival,
): { sends: Send[]; missing: SceneLight[] } {
  const byId = new Map(lights.map(l => [l.id, l]));
  const sends: Send[] = [];
  const missing: SceneLight[] = [];
  for (const s of scene.lights) {
    const light = byId.get(s.id);
    if (!light || !selectable(light)) {
      missing.push(s);
      continue;
    }
    sends.push({
      light,
      type: 'light_set_state',
      payload: {
        animation: s.animation,
        brightness: s.brightness,
        is_on: s.is_on,
        ...(arrival ? { transition: arrival } : {}),
      },
    });
  }
  return { sends, missing };
}

export function sceneCounts(scene: Scene): { on: number; off: number } {
  const on = scene.lights.filter(l => l.is_on).length;
  return { on, off: scene.lights.length - on };
}

/**
 * Does this look like a Scene? The same test `server/library.mjs` applies to the folder, and
 * duplicated for the reason `looksLikePatch` is: that one has to hold for a caller that is not
 * the editor.
 * @public
 */
export function looksLikeScene(raw: any): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'not a JSON object';
  if (!Array.isArray(raw.lights)) return 'no `lights` array — is this a scene?';
  if (!raw.lights.length) return 'a scene with no lights changes nothing';
  if (raw.lights.length > MAX_SCENE_LIGHTS)
    return `${raw.lights.length} lights — a scene holds ${MAX_SCENE_LIGHTS}`;
  const i = raw.lights.findIndex((l: any) =>
    !l || typeof l.id !== 'string' || !l.id || typeof l.is_on !== 'boolean'
    || !l.animation || typeof l.animation.type !== 'string');
  if (i >= 0) return `light ${i} needs an id, is_on and an animation with a type`;
  return null;
}

// ------------------------------------------------------------------ reporting

const names = (all: string[]) =>
  all.length <= 3 ? all.join(', ') : `${all.slice(0, 2).join(', ')} and ${all.length - 2} more`;

/** What happened, in the words a person needs: how many went out, and who by name did not. */
export function deliveryNote(deliveries: Delivery[], missing: { name: string }[] = []): string {
  const sent = deliveries.filter(d => d.outcome === 'sent').length;
  const lost = deliveries.filter(d => d.outcome === 'unreachable').map(d => d.light.name);
  const parts = [`sent to ${sent} light${sent === 1 ? '' : 's'}`];
  if (lost.length) parts.push(`${names(lost)} did not answer`);
  if (missing.length) parts.push(`${names(missing.map(m => m.name))} not found`);
  return parts.join(' · ');
}
