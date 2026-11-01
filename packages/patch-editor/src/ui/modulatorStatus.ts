import type { Modulator } from '../domain/patch';

/**
 * Whether this modulator can do anything at all once loaded.
 *
 * `source` is one wire with two consumers: a threshold reads its source's VALUE, an
 * envelope reads its source's EDGE. Neither does anything without one.
 */
export function deadReason(m: Modulator): string | null {
  if (m.type === 'envelope' && m.source === undefined)
    return 'pick a source — the envelope fires on its edge'
  if (m.type === 'threshold' && m.source === undefined) return 'pick a source for this threshold';
  // A math node with one operand missing is not half-working, it is reading zero on that
  // side -- which makes `abs_diff` a passthrough and `mul` a permanent nought.
  if (m.type === 'math' && (m.source === undefined || m.sourceB === undefined)) {
    return 'math needs both operands';
  }
  return null;
}
