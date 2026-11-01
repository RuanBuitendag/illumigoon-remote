/**
 * Which publishes are legal for the document that is open (#58).
 *
 * Publishing an edited patch is one of three things, and the editor must not *ask* which —
 * asking is how an author who meant "a new version of this" ends up with a second family that
 * nothing connects to the first. Two of the three are decidable from the documents alone, and
 * the third is a declaration only a person can make, so the editor offers the legal ones and
 * lets the author choose when more than one is.
 *
 *   positions moved, nothing else        a PRESET of the version already published
 *   more than positions, still readable  a new VERSION of the same family
 *   a control now means something else   a new PATCH, family cleared
 *
 * **WHY THE EDITOR AND NOT THE SERVER.** A changed graph is a different content hash and so a
 * different family by definition; the server receiving it cannot tell a revision from a fork
 * because both arrive as bytes it has never seen. What knows is the FOLDER — the patch file
 * remembers the family it was published as, and `published/<patch>.json` beside it holds what
 * was actually sent. That pair is the only evidence anywhere that the author meant a revision.
 * Same boundary `presets.asAuthored` draws: read what the author declared, never infer
 * parentage from resemblance.
 *
 * THE REFERENCE IS THE SNAPSHOT AND NOT THE WORKING FILE, which is #68 and was a real bug
 * rather than a precaution. Save rewrites the working file with an edited graph and keeps the
 * stamp, so after publish-edit-Save it claims a version it no longer holds; diffing against it
 * answered "nothing has changed", offered only a re-publish, and the edit never went up.
 *
 * **WHAT MAKES A VERSION ILLEGAL** is not a changed surface but a changed *meaning*. Key-set
 * equality is not enough and neither is the field list: a `max` moving from 100 to 200
 * reinterprets every stored position, and so do `lo`, `hi` and `curve`, a select's `choices`
 * reordering, and a toggle's `invert` flipping — none of which is visible on the surface at
 * all. A `label`, a `unit`, a `group` or a new control changes what a position is CALLED and
 * not what it means, so those are free. That is the whole rule: renaming is free, reinterpreting
 * is not.
 *
 * Additive-only is what buys graceful degradation everywhere else: an older surface stays a
 * valid subset of a newer one, so a phone holding v2 of a patch a light runs at v4 draws v2's
 * controls and every one of them still works. Removing a control breaks that, which is why a
 * removal refuses a bump even though the spec's list does not name it.
 *
 * NOTHING IN HERE MAY TOUCH THE BROWSER: `check-publishkind.mjs` imports it on a host with no
 * DOM, which is the point — this is the half of publishing that can be checked without a light,
 * a server, or a person.
 */

import { readIdentity, type Patch, type PatchIdentity } from './patch';
import { deserialise, serialise } from './patchDocument';
import {
  keptControls,
  mappingOf,
  neutralise,
  positionOf,
  resolveTarget,
  type Position,
} from './surface';
import { type Control } from './control';

// ------------------------------------------------------------------- types

export type PublishKind = 'preset' | 'version' | 'patch';

/** A control whose stored positions would be reinterpreted, and the field that does it. */
export interface Break {
  key: string;
  /** `gone` is a removal, including the removal half of a rename. */
  field: 'gone' | 'type' | 'target' | 'min' | 'max' | 'step' | 'lo' | 'hi' | 'curve'
       | 'choices' | 'invert';
  was?: unknown;
  now?: unknown;
}

export interface Verdict {
  /** The publishes that are legal, in the order they should be offered. */
  offered: PublishKind[];
  /** Why a version is refused, when it is. Empty when one is legal. */
  breaks: Break[];
  /** The identity the file remembers, or undefined when it has never been published. */
  identity?: PatchIdentity;
  /**
   * The open document is the published one. Not "nothing to do": a re-publish is how a patch
   * comes back after the server loses its disk, which has happened (#65). `offered` is empty
   * because none of the three is a new thing — the rail offers a re-publish instead.
   */
  unchanged: boolean;
  /** Only positions moved. The one case a preset can carry, and the reason it is offered. */
  positionsOnly: boolean;
  /**
   * The file says it was published and there is no copy of what was published to diff against
   * (#68): a fresh clone, a renamed patch, a snapshot somebody tidied away.
   *
   * NOT THE SAME AS NEVER PUBLISHED, and the difference matters: clearing the stamp would fork
   * the author's own work, which is the thing this module exists to prevent. So the family is
   * kept, a version and a new patch are offered, and a preset is not -- a preset would have to
   * assume nothing structural moved, and that is the one assumption that loses work.
   */
  referenceMissing: boolean;
}

// ----------------------------------------------------------------- meaning

/**
 * Everything about @p c that decides what a stored position MEANS, resolved against @p patch.
 *
 * Resolved rather than read off the control, because `min` absent and `min` equal to the
 * parameter's own minimum are the same control spelled twice — and a document that gains the
 * explicit spelling has not changed. `mappingOf` is the same resolution `positionOf` uses to
 * report the position in the first place.
 */
function meaningOf(patch: Patch, c: Control): Record<string, unknown> {
  const m: Record<string, unknown> = { type: c.type, target: c.target };
  const r = resolveTarget(patch, c.target);

  if (r?.kind === 'float') {
    const map = mappingOf(c, r.spec!);
    m.min = map.min;
    m.max = map.max;
    // Only when a range is laid over the target's own. Unmapped, `lo`/`hi` are the spec's own
    // bounds and carry no meaning of their own -- reporting them would refuse a version bump
    // for a patch whose parameter spec moved under it.
    if (map.mapped) { m.lo = map.lo; m.hi = map.hi; }
    m.curve = map.curve;
    m.step = c.step ?? null;
  }
  // A select stores its INDEX, so the wire names behind it are its meaning; `options` are the
  // labels drawn over them and are free to change. A toggle's `invert` decides which way its
  // stored boolean reads.
  if (c.type === 'select') m.choices = [...(c.choices ?? [])];
  if (c.type === 'toggle') m.invert = !!c.invert;
  return m;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// ----------------------------------------------------------------- reading

/** The document's graph and surface with every position blanked. See `neutralise`. */
function structureOf(doc: unknown): string {
  const form = serialise(neutralise(deserialise(doc)));
  // Identity is a label the server assigns, not graph -- the same keys `idOf` strips before
  // hashing. A document that carries one would otherwise never match one that does not.
  delete form.familyId;
  delete form.version;
  return JSON.stringify(form);
}

/** Every control's position, by key. Controls that report none are absent, as in the document. */
function positionsOf(patch: Patch): Map<string, Position> {
  const out = new Map<string, Position>();
  for (const c of keptControls(patch)) {
    const p = positionOf(patch, c);
    if (p !== undefined) out.set(c.key, p);
  }
  return out;
}

// ------------------------------------------------------------- classifying

/** What would be reinterpreted: each control @p before had whose meaning @p after changes. */
function breaksBetween(before: Patch, after: Patch): Break[] {
  const breaks: Break[] = [];
  const now = new Map(keptControls(after).map(c => [c.key, c]));
  for (const c of keptControls(before)) {
    const n = now.get(c.key);
    if (!n) {
      // A RENAMED KEY LANDS HERE, as a removal beside an unrelated addition, and nothing can
      // tell that from a deletion -- a key is what a Scene stores a position under, so the two
      // are the same event as far as anything holding one is concerned.
      breaks.push({ key: c.key, field: 'gone' });
      continue;
    }
    const was = meaningOf(before, c);
    const is = meaningOf(after, n);
    for (const field of Object.keys({ ...was, ...is })) {
      if (!same(was[field], is[field])) {
        breaks.push({
          key: c.key,
          field: field as Break['field'],
          was: was[field],
          now: is[field],
        });
      }
    }
  }
  return breaks;
}

function positionsMoved(before: Patch, after: Patch): boolean {
  const wasAt = positionsOf(before);
  const isAt = positionsOf(after);
  return (
    wasAt.size !== isAt.size || [...isAt].some(([k, v]) => !wasAt.has(k) || !same(wasAt.get(k), v))
  );
}

/**
 * What @p open may be published as, given @p published — the document it was opened from.
 *
 * @param open      the document about to be sent, exactly as it will be sent
 * @param published what `published/<patch>.json` holds — the document that was last sent — or
 *                  null both for a patch never published and for one whose snapshot is gone.
 *                  Which of those two it is, `open`'s own stamp decides.
 */
export function classify(open: unknown, published: unknown): Verdict {
  // TWO IDENTITIES, AND THEY ANSWER DIFFERENT QUESTIONS. What the open document CLAIMS to be
  // says whether a family is at stake; what the reference KNOWS itself to be says whether there
  // is anything to diff. They agree in the ordinary case and their disagreement is the whole of
  // #68.
  const claimed = readIdentity(open);
  const identity = readIdentity(published);
  const bare = { breaks: [], unchanged: false, positionsOnly: false, referenceMissing: false };

  // Never published, or published by something that did not stamp it. A new patch is the only
  // thing this can be: there is no family to add a version to and no version to preset.
  if (!claimed && !identity) return { ...bare, offered: ['patch'] };

  // The author cleared the family in the document they are holding. That is a declaration, and
  // a reference to something it is no longer claiming to be does not soften it.
  if (!claimed) return { ...bare, offered: ['patch'] };

  // Published, reference unavailable -- or a snapshot that belongs to some other patch, which a
  // rename can leave behind. Offer what can be offered without knowing what changed.
  if (!identity || identity.familyId !== claimed.familyId) {
    return { ...bare, offered: ['version', 'patch'], identity: claimed, referenceMissing: true };
  }

  const before = deserialise(published);
  const after = deserialise(open);

  const breaks = breaksBetween(before, after);
  const structural = structureOf(published) !== structureOf(open);
  const moved = positionsMoved(before, after);

  if (!structural && !moved) {
    return { offered: [], breaks: [], identity, unchanged: true, positionsOnly: false,
             referenceMissing: false };
  }

  // --- what that leaves ---------------------------------------------------
  const positionsOnly = !structural && moved;
  const offered: PublishKind[] = [];

  // A preset carries positions and nothing else, so it is offered only when positions are all
  // that moved. Offering one for a structural edit would publish the knobs and drop the rest
  // without saying so -- the one outcome here that loses work.
  if (positionsOnly) offered.push('preset');
  if (!breaks.length) offered.push('version');
  // ALWAYS LAST AND ALWAYS AVAILABLE. A fork is a declaration, not a deduction: an author who
  // means "this is its own thing now" is right regardless of how little changed.
  offered.push('patch');

  return { offered, breaks, identity, unchanged: false, positionsOnly, referenceMissing: false };
}

/**
 * The same patch, declared to be its own thing.
 *
 * CLEARING THE FAMILY IS THE WHOLE ACT. An identity is a pair, both or neither, so dropping it
 * leaves a document that says "this has never been published" -- which is true of the thing the
 * author has just decided to make. The server then hashes the graph and mints a family for it,
 * and nothing links the two, which is what a fork means.
 */
export const forked = (patch: Patch): Patch => ({ ...patch, identity: undefined });

/** One line a person can act on, for a version that is refused. */
export function whyNoVersion(breaks: readonly Break[]): string | null {
  if (!breaks.length) return null;
  const gone = breaks.filter(b => b.field === 'gone').map(b => b.key);
  const changed = breaks.filter(b => b.field !== 'gone');
  const parts: string[] = [];
  if (gone.length) parts.push(`${gone.join(', ')} ${gone.length > 1 ? 'are' : 'is'} gone`);
  for (const b of changed.slice(0, 3)) parts.push(`${b.key}'s ${b.field} changed`);
  if (changed.length > 3) parts.push(`and ${changed.length - 3} more`);
  return `${parts.join('; ')} — stored positions would mean something else, so this is a new patch`;
}
