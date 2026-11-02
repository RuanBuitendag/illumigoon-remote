/** The library the rest of the app reads, so the home screen and the editor hold one set of files. */

export { documentOf, usesAudio, type Scene, type SceneLight } from '../domain/house';
export { setHostFetch } from '../host';
export { listPalettes, toPaletteDoc, writePalette, type PaletteEntry } from './palettes';
export {
  deleteLocalPreset, deletePreset, deletePublished, downloadPreset, fetchPublished, listExamples,
  listLibrary, listPresets, parsePreset, readPreset, readPresetFile, serverLibrary, slugFileName,
  writePreset, type LibraryEntry, type Preset,
} from './presets';
export { deleteScene, listScenes, sceneFileFor, writeScene, type SceneEntry } from './scenes';
export { shelfOf, type ServerLibrary, type Shelf } from '../domain/shelf';
