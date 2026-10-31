// Types for engine.mjs. Both files come from smart-lighting-firmware/tools/patch-editor:
// run `npm run engine:build` there and copy src/engine/generated/ here.
export type EngineModule = {
  HEAPU8: Uint8Array;
  stringToNewUTF8: (text: string) => number;
  _free: (pointer: number) => void;
  _eng_message: (pointer: number) => number;
  _eng_tick: (seconds: number) => void;
  _eng_frame: (pixels: number) => number;
  _eng_uses_audio: () => number;
  _eng_demo_audio: (isOn: number) => void;
};

export default function createEngine(): Promise<EngineModule>;
