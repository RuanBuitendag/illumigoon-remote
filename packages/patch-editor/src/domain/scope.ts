/**
 * What an audio band is hearing, as the light reports it: the graph under an `audio_band`'s knobs.
 *
 * PURE. Parses the `bands` half of an `audio_level` payload into a short history per modulator
 * slot. The socket that asks for them is `device/wire.ts`; the picture is `ui/BandScope.tsx`.
 *
 * THREE NUMBERS PER FRAME, because the node's two knobs act on two different signals
 * (`AudioBandSignal::update`):
 *
 *   raw    the band's average bin, before anything — what Threshold is subtracted from
 *   norm   after Threshold, auto-gain and Sensitivity, clamped to 1 — what Squelch cuts
 *   out    what the node publishes: squelched, then smoothed
 *
 * One trace with both lines on it would draw Threshold against a signal it never touches.
 *
 * Fixed-point on the wire, 0–65535 of 1.0, like the level samples beside them. A jump in `seq`
 * is frames the light produced and nobody received, and is kept as a HOLE — a graph drawing a
 * line across a gap it never saw would show a quiet room where there was only a lost packet.
 */

interface BandFrames {
  /** Sequence number of `frames[0]`. */
  seq?: number;
  /** Frames per second. */
  rate?: number;
  /** One entry per frame; each is `[slot, raw, norm, out]` for every audio band in the patch. */
  frames?: unknown;
}

export interface AudioLevel {
  seq?: number;
  rate?: number;
  samples?: unknown;
  bands?: BandFrames;
}

export interface Series {
  raw: number[];
  norm: number[];
  out: number[];
}

/** How much a graph shows: long enough to see a phrase, short enough to read a beat. */
export const SCOPE_SECONDS = 6;

const FULL = 65535;

export class BandHistory {
  rate = 50;
  /** When the last BAND frame arrived, ms since epoch. Null until one has. */
  lastAt: number | null = null;
  /**
   * When the last `audio_level` of any kind arrived. Apart from `lastAt` because a light streams
   * its
   * samples whether or not the patch on it runs a band: frames with no `bands` mean the stream is
   * up
   * and this graph has nothing to draw -- an edit that never landed, or a light that is off -- and
   * that must not read as still asking.
   */
  heardAt: number | null = null;
  private next: number | null = null;
  private readonly slots = new Map<number, Series>();

  constructor(readonly seconds = SCOPE_SECONDS) {}

  private get cap(): number {
    return Math.max(1, Math.round(this.seconds * this.rate));
  }

  private push(slot: number, raw: number, norm: number, out: number) {
    let s = this.slots.get(slot);
    if (!s) { s = { raw: [], norm: [], out: [] }; this.slots.set(slot, s); }
    s.raw.push(raw); s.norm.push(norm); s.out.push(out);
    const over = s.raw.length - this.cap;
    if (over > 0) { s.raw.splice(0, over); s.norm.splice(0, over); s.out.splice(0, over); }
  }

  private hole(frames: number) {
    for (const slot of this.slots.keys())
      for (let i = 0; i < frames; i++) this.push(slot, NaN, NaN, NaN);
  }

  /** Fold one `audio_level` payload in. Anything malformed is skipped, never thrown on. */
  take(p: AudioLevel | null | undefined, now = Date.now()): void {
    if (p && typeof p === 'object') this.heardAt = now;
    const b = p?.bands;
    if (!b || !Array.isArray(b.frames)) return;
    if (typeof b.rate === 'number' && b.rate > 0) this.rate = b.rate;
    const seq = typeof b.seq === 'number' ? b.seq : (this.next ?? 0);

    if (this.next !== null) {
      // Far behind what came before: the light restarted and its count did too.
      if (seq + this.cap < this.next) this.clear();
      else if (seq > this.next) this.hole(Math.min(seq - this.next, this.cap));
    }

    for (const frame of b.frames) this.takeFrame(frame);
    this.next = seq + b.frames.length;
    this.lastAt = now;
  }

  private takeFrame(frame: unknown) {
    const seen = new Set<number>();
    for (const tap of Array.isArray(frame) ? frame : []) {
      if (!Array.isArray(tap) || tap.length < 4) continue;
      const [slot = NaN, raw = 0, norm = 0, out = 0] = tap.map(Number);
      if (!Number.isInteger(slot) || slot < 0) continue;
      this.push(slot, raw / FULL, norm / FULL, out / FULL);
      seen.add(slot);
    }
    // A slot missing from a frame keeps its place in time with a hole, so every trace ends now.
    for (const slot of this.slots.keys()) if (!seen.has(slot)) this.push(slot, NaN, NaN, NaN);
  }

  /** Oldest first, newest last. Null for a slot nothing has been heard about. */
  series(slot: number): Series | null {
    return this.slots.get(slot) ?? null;
  }

  clear() {
    this.slots.clear();
    this.next = null;
    this.lastAt = null;
    this.heardAt = null;
  }
}

/**
 * The stream, as a component may hold it: a history to draw, and a way to keep it coming.
 *
 * Declared here, not in `device/`, because a component may not import the device
 * (`check:layers`); the composition root builds one over its `Wire`.
 */
export interface AudioFeed {
  readonly history: BandHistory;
  /**
   * Ask the light to stream until the returned function is called. Counted: two graphs share one
   * stream.
   */
  listen(): () => void;
}
