/** The library the rest of the app reads, so the home screen and the editor hold one set of files. */

export type { Scene, SceneLight } from '../domain/house';
export { setHostFetch } from '../host';
export { listPalettes, toPaletteDoc, writePalette, type PaletteEntry } from './palettes';
export { slugFileName } from './presets';
export { deleteScene, listScenes, sceneFileFor, writeScene, type SceneEntry } from './scenes';
