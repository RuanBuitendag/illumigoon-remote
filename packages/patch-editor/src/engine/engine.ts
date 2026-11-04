/**
 * The patch engine, as the ESP32 builds it, compiled to WebAssembly.
 *
 * NOTHING HERE KNOWS ABOUT THE EDITOR. This file is the C ABI and the marshalling across it,
 * and nothing else, so the boundary reads the same here as it will under JNI on the phone:
 *
 *     int            eng_message(const char* envelopeJson)
 *     void           eng_tick(float dt)
 *     const uint8_t* eng_frame(int pixels)
 *     uint32_t       eng_catalog_hash(void)
 *     int            eng_uses_audio(void)
 *     float          eng_mod_value(int slot, int out)
 *     uint32_t       eng_mod_fires(int slot, int out)
 *
 * What the editor does with it -- the tap, the seed, the clock -- is `preview.ts`.
 *
 * THE MODULE IS GENERATED AND MAY NOT BE THERE. `src/engine/generated/` is written by the
 * engine build and gitignored, because a committed binary is a second copy of the engine that
 * can drift. So it is found with `import.meta.glob` rather than a static import: a glob that
 * matches nothing is an empty object, where a missing static import fails the whole bundle
 * and takes the editor down with it. Vite re-evaluates the glob when the file appears.
 */

/** What an Emscripten `-sMODULARIZE -sEXPORT_ES6` build resolves to. */
export interface EngineModule {
  /**
   * Re-read on every use, never held. `-sALLOW_MEMORY_GROWTH` replaces the underlying buffer
   * when memory grows, and a view taken before that reads a detached, zero-length array.
   */
  HEAPU8: Uint8Array;
  _malloc(bytes: number): number;
  _free(ptr: number): void;
  _eng_message(ptr: number): number;
  _eng_tick(dt: number): void;
  _eng_frame(pixels: number): number;
  _eng_catalog_hash(): number;
  _eng_uses_audio(): number;
  /** Absent from an engine built before the house screen's recordings had a stand-in beat. */
  _eng_demo_audio?(on: number): void;
  /** Absent from an engine built before the modulator visuals (LIFE-1961). */
  _eng_mod_value?(slot: number, out: number): number;
  _eng_mod_fires?(slot: number, out: number): number;
}

type Factory = (overrides?: object) => Promise<EngineModule>;

const found = import.meta.glob<Factory>('./generated/engine.mjs', { import: 'default' });

/** Why the engine could not be had: not built at all, or built and refused to start. */
export type LoadFailure = { missing: true } | { missing: false; why: string };

export class Engine {
  private readonly utf8 = new TextEncoder();

  private constructor(private readonly m: EngineModule) {}

  /** @returns the engine, or why there is none. Never throws. */
  static async load(): Promise<Engine | LoadFailure> {
    const importer = Object.values(found)[0];
    if (!importer) return { missing: true };
    try {
      const factory = await importer();
      return new Engine(await factory());
    } catch (e: any) {
      return { missing: false, why: e?.message ?? String(e) };
    }
  }

  /**
   * One envelope, as the exact string that went down the socket.
   *
   * Copied into wasm memory as a NUL-terminated C string and freed straight after: the engine
   * parses it inside the call and keeps nothing pointing into it. Not a per-frame path --
   * messages arrive at most at the wire's ~30 Hz flush -- so the encode allocating is fine.
   *
   * @returns whether the engine changed, per `eng_message`.
   */
  message(envelope: string): boolean {
    const bytes = this.utf8.encode(envelope);
    const ptr = this.m._malloc(bytes.length + 1);
    if (!ptr) return false;
    try {
      // After the malloc, not before: the allocation is what can grow memory.
      const heap = this.m.HEAPU8;
      heap.set(bytes, ptr);
      heap[ptr + bytes.length] = 0;
      return this.m._eng_message(ptr) === 1;
    } finally {
      this.m._free(ptr);
    }
  }

  tick(dt: number) { this.m._eng_tick(dt); }

  /**
   * Shade `pixels` LEDs and copy them into an RGBA buffer the caller owns.
   *
   * INTO, NOT OUT. This runs every animation frame, so it allocates nothing: no `subarray`
   * view, no fresh array. Alpha is the caller's to set once when it makes the buffer.
   */
  frameInto(pixels: number, rgba: Uint8ClampedArray) {
    const src = this.m._eng_frame(pixels);
    const heap = this.m.HEAPU8;
    if (!src) {
      for (let d = 0; d < pixels * 4; d += 4) rgba[d] = rgba[d + 1] = rgba[d + 2] = 0;
      return;
    }
    for (let s = src, d = 0, end = src + pixels * 3; s < end; s += 3, d += 4) {
      rgba[d] = heap[s] ?? 0;
      rgba[d + 1] = heap[s + 1] ?? 0;
      rgba[d + 2] = heap[s + 2] ?? 0;
    }
  }

  /** Unsigned, to compare with `catalog_hash` off the wire: a uint32 crosses as a signed i32. */
  catalogHash(): number { return this.m._eng_catalog_hash() >>> 0; }

  usesAudio(): boolean { return this.m._eng_uses_audio() !== 0; }

  /**
   * A stand-in 120 BPM beat into audio patches, restarted from its first beat (`eng_demo_audio`).
   * For the house screen's recordings only: the preview strip promises it is not simulating audio.
   * A no-op on an engine built without it.
   */
  demoAudio(on: boolean) { this.m._eng_demo_audio?.(on ? 1 : 0); }

  /**
   * What the modulator in `slot` put out after the last tick (`eng_mod_value`), or undefined for
   * an empty or bypassed slot, or an engine built without the call.
   */
  modValue(slot: number, out = 0): number | undefined {
    const v = this.m._eng_mod_value?.(slot, out);
    return v === undefined || Number.isNaN(v) ? undefined : v;
  }

  /** How many ticks the slot fired on since its node was built (`eng_mod_fires`), unsigned. */
  modFires(slot: number, out = 0): number { return (this.m._eng_mod_fires?.(slot, out) ?? 0) >>> 0; }
}
