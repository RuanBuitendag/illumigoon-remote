/**
 * How the laptop installer is built and where it is published.
 *
 * electron-builder cannot finish inside a OneDrive folder, because the sync client holds the
 * directory it renames. Under OneDrive the build goes to %LOCALAPPDATA%. `EDITOR_RELEASE_DIR`
 * overrides both.
 */

import { join } from 'node:path';

const underOneDrive = /onedrive/i.test(process.cwd());
const output =
  process.env.EDITOR_RELEASE_DIR ??
  (underOneDrive ? join(process.env.LOCALAPPDATA ?? process.cwd(), 'illumigoon', 'release') : 'release');

export default {
  appId: 'com.modulyte.patch-editor',
  productName: 'Illumigoon',
  directories: { output, buildResources: 'packaging' },
  files: [
    'electron/**',
    'packages/patch-editor/server/**',
    '!packages/patch-editor/server/.catalog-cache.json',
    'dist/**',
    '!dist/**/*.map',
    '!node_modules/@capacitor/**',
    '!node_modules/@capgo/**',
    '!node_modules/@mhaberler/**',
    '!node_modules/@base-ui/**',
    '!node_modules/@fontsource/**',
    '!node_modules/@illumigoon/**',
    '!node_modules/react/**',
    '!node_modules/react-dom/**',
    '!node_modules/zustand/**',
  ],
  // The examples and starters, read-only, beside the app. main.mjs points the helper at them.
  extraResources: [
    { from: 'packages/patch-editor/examples/patches', to: 'examples/patches' },
    { from: 'packages/patch-editor/examples/fragments', to: 'examples/fragments' },
    { from: 'packages/patch-editor/examples/palettes', to: 'examples/palettes' },
  ],
  win: { target: 'nsis', icon: 'packaging/icon.ico' },
  nsis: { oneClick: true, perMachine: false },
  // A public repo that holds only installers, so the app reads it without a token. A draft is
  // invisible to the updater until scripts/promote-release.mjs has seen every file arrive.
  publish: {
    provider: 'github',
    owner: 'RuanBuitendag',
    repo: 'smart-lighting-patch-editor-releases',
    releaseType: 'draft',
  },
};
