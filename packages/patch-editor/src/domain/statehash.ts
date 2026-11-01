/**
 * `state_hash`, recomputed off-device.
 *
 * The light broadcasts this on every heartbeat so a client can tell its copy has gone stale
 * without polling. The catch has always been that the editor's own writes move it too, so
 * `stale.ts` guesses on a time window: a hash that changes while our write is still working
 * through the device is ours, and one that changes later is somebody else's. It works, and
 * it pays for the fix by adopting a genuine remote change inside that window in silence.
 *
 * With the hash computed here there is no window and no guess. "Changed elsewhere" becomes
 * what it says: the light's hash disagrees with the hash of the patch we hold.
 *
 * THIS IS A THIRD IMPLEMENTATION OF ONE RULE, and that is the whole risk. The rules live in
 * `docs/MESSAGING_SPEC.md`, the firmware implements them in `src/lighting/state_hash.cpp`,
 * the Android app implements them in `domain/animation/StateHash.kt`, and this is the third.
 * Float formatting, key ordering and which parameters count at all have to agree byte for
 * byte or the badge is worse than the window it replaced. `docs/state_hash_vectors.json`
 * exists for exactly this, and `check:statehash` runs every vector through this file.
 *
 * Ported from the C++ line by line rather than from the prose, because the prose is what
 * three implementations are each interpreting.
 */

/** One manifest entry, as `light_manifests_res` and the published vectors carry it. */
export interface ManifestParam {
  key: string;
  type: string;
  step?: number;
  default?: any;
}

/** The `animation` object as `light_state_res` reports it. */
export interface AnimationState {
  type?: string;
  params?: any;
}

/**
 * From `include/core/config.h`. A stepless slider falls back to this, and so does every
 * number inside a state document — nothing finer survives another language's float
 * formatting, and nothing coarser would notice a real edit.
 */
export const STATE_HASH_STEP_FALLBACK = 0.001;

/**
 * A number as an integer count of its step.
 *
 * `Math.fround` on both operands is not decoration. The firmware holds parameters as `float`
 * and `quantise` widens them to `double` for the division, so the value being divided is a
 * float32 rounded to the nearest representable number — 0.35 is 0.3499999940395355, not
 * 0.35. Dividing the float64 0.35 by the float64 0.01 gives 34.999999999999996, and the two
 * only agree because the +0.5 floor is generous. On a value where it is not, they part.
 *
 * `floor(x + 0.5)`, never `Math.round`: they agree for positive values, but the rule is
 * "ties toward positive infinity" so that a negative range hashes the same in every
 * language. `Math.round` in JS happens to do the same thing; writing the floor makes the
 * rule visible rather than lucky.
 */
function quantise(value: number, step?: number): string {
  const s = step && step > 0 ? Math.fround(step) : Math.fround(STATE_HASH_STEP_FALLBACK);
  return String(Math.floor(Math.fround(value) / s + 0.5));
}

/** Six lowercase hex digits, `rrggbb`, no leading `#`. */
function hex6(c: any): string {
  const b = (n: any) => (Number(n) | 0).toString(16).padStart(2, '0');
  return `${b(c?.r ?? 0)}${b(c?.g ?? 0)}${b(c?.b ?? 0)}`;
}

/** The canonical form of one manifest parameter's value. */
function fromValue(p: ManifestParam, v: any): string {
  switch (p.type) {
    case 'slider':  return quantise(Number(v) || 0, p.step);
    case 'stepper':
    case 'select':  return String(Number(v) | 0);
    case 'toggle':  return v ? '1' : '0';
    case 'color':   return hex6(v);
    case 'palette': return Array.isArray(v) ? v.map(hex6).join(',') : '';
    default:        return '';
  }
}

/**
 * A value inside a state document.
 *
 * The branch order is load-bearing, and the C++ says why: a bool answers `is<int>()` too,
 * and a palette entry is a string that must not be read as a number.
 *
 * A null contributes NOTHING — the key is still written, the value is empty. That is what
 * `if (v.isNull()) return;` does on the other side, and it is a shape a document can
 * genuinely have.
 */
function canonicalValue(v: any): string {
  if (Array.isArray(v)) return `[${v.map(canonicalValue).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    return `{${Object.keys(v).sort().map(k => `${k}:${canonicalValue(v[k])}`).join(',')}}`;
  }
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  return quantise(Number(v));
}

/**
 * The exact string the hash is taken over.
 *
 * Public because it is what makes a mismatch diagnosable: comparing two canonical strings
 * says WHICH parameter disagrees, where comparing two integers says only that something
 * does. The published vectors carry it for that reason, and so should any bug report.
 *
 * @param manifest the animation's parameters, or `null` when this build has never heard of
 *        the animation. The distinction matters and is not cosmetic: `null` means the id
 *        alone is the most truthful comparable statement available, while `[]` means the
 *        animation declares no parameters BECAUSE its state is a document the manifest
 *        cannot describe. Today that is `patch`, and treating the two the same is how every
 *        patch ever built hashed to fnv1a("patch") = 4178578089 (LIFE-731).
 */
export function canonicalise(state: AnimationState, manifest: ManifestParam[] | null): string {
  const type = state?.type ?? '';
  if (!type) return '';
  if (!manifest) return type;

  // Sorted by key, and taken from the MANIFEST rather than from the payload: two
  // implementations must agree on the order, and on which keys count at all. A key in the
  // state with no manifest entry is excluded, and so is every INTERNAL parameter.
  const ordered = manifest
    .filter(p => p.type !== 'internal')
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  if (!ordered.length) return `${type}|${canonicalValue(state.params)}`;

  const params = state.params ?? {};
  return type + ordered.map(p => {
    // A parameter missing from the state contributes its manifest default, so a partial
    // state and a complete one describing the same look agree.
    const v = params[p.key];
    return `|${p.key}=${fromValue(p, v === undefined || v === null ? p.default : v)}`;
  }).join('');
}

/** FNV-1a 32 over the UTF-8 bytes. The same function `schemaHash` uses. */
export function fnv1a(data: string): number {
  let h = 2166136261 >>> 0;
  for (const byte of new TextEncoder().encode(data)) {
    h = (h ^ byte) >>> 0;
    // The prime, by shift-and-add: `h * 16777619` overflows the 53-bit integer a JS number
    // holds exactly, and would start silently rounding somewhere in the middle of the string.
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

/** The hash itself. 0 when there is no animation to describe, as the firmware reports. */
export function stateHash(state: AnimationState, manifest: ManifestParam[] | null): number {
  const canonical = canonicalise(state, manifest);
  return canonical ? fnv1a(canonical) : 0;
}
