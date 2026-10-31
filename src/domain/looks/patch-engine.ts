import { LED_COUNT } from '../../design-system';
import type { EngineModule } from './engine/engine.mjs';

// The patch engine as the firmware builds it, compiled to WebAssembly, so a preview shows what the
// strip shows. One module holds one look, which is enough: previews play back recordings.


// What the light integrates at. A step of 5 ms is the firmware's 200 frames a second.
const TICK_SECONDS = 0.005;

let engine: Promise<EngineModule> | null = null;

function loadEngine() {
  engine ??= import('./engine/engine.mjs').then(({ default: createEngine }) => createEngine());
  return engine;
}

function send(module: EngineModule, type: string, payload: object) {
  const envelope = { type, version: 1, payloadVersion: 1, id: 1, source: 'preview', target: 'engine', payload };
  const pointer = module.stringToNewUTF8(JSON.stringify(envelope));
  module._eng_message(pointer);
  module._free(pointer);
}

function tick(module: EngineModule, seconds: number) {
  const ticks = Math.round(seconds / TICK_SECONDS);
  for (let index = 0; index < ticks; index++) module._eng_tick(TICK_SECONDS);
}

export type PatchTake = {
  warmUpSeconds: number;
  frameSeconds: number;
  frameCount: number;
};

// Frames follow each other in one flat array of red, green and blue bytes.
export async function recordPatch(document: object, take: PatchTake) {
  const module = await loadEngine();
  send(module, 'light_set_state', { animation: { type: 'patch', params: document } });
  // A look that listens to music is dark in a quiet engine, so it hears a stand-in beat.
  module._eng_demo_audio(module._eng_uses_audio());
  tick(module, take.warmUpSeconds);
  const frameBytes = LED_COUNT * 3;
  const frames = new Uint8Array(take.frameCount * frameBytes);
  for (let index = 0; index < take.frameCount; index++) {
    tick(module, take.frameSeconds);
    const pointer = module._eng_frame(LED_COUNT);
    frames.set(module.HEAPU8.subarray(pointer, pointer + frameBytes), index * frameBytes);
  }
  return frames;
}
