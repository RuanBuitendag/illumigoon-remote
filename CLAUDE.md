# Illumigoon

One app for the Illumigoon lights: control and patch editing, on the iPhone and on the laptop. Capacitor, Electron,
React, zustand, Base UI.

One web build runs in two shells. `electron/main.mjs` is the laptop shell, and it starts the helper process in
`packages/patch-editor/server` that finds lights and holds files. On the iPhone the same `/api` paths are answered in
the page, by `packages/patch-editor/src/phone`, from the same `server/library.mjs`.

`packages/patch-editor` is the editor (LIFE-1885). It has its own lint gate, and the domain is the only layer that
imports it. There is no separate editor to open: Edit is a page of the app, reached from EDIT on a room's look, the
same on both sizes. Its parts move into the three layers below one at a time.

## Layers

All source sits in three layers. Imports only point down. `src/main.tsx` is the only file outside them.

| Layer | Holds | May import |
| -- | -- | -- |
| `src/domain` | light network, looks, stores, app update, and the screens that connect data to composites | `composites`, `design-system`, itself |
| `src/composites` | assemblies with props in and callbacks out, and their CSS | `design-system`, itself |
| `src/design-system` | tokens, fonts, primitives, colour maths, LED strip drawing | libraries, itself |

- Each layer has one door, its `index.ts`. Other layers import only the door.
- The domain holds no look: no `className`, no `style`, no CSS, no raw HTML controls, no raw colours.
- A screen that needs a new look gets a new composite, not a style.
- Base UI and fonts are only in `design-system`. zustand and the Capacitor plugins are only in `domain`.
- Inside `domain`: `screens` -> `store` -> `looks`, `light-network`. Logic never imports a screen.

## Checks

`npm run lint` runs eight checks and reports every failure in one run. CI runs it before each build.

| Script | Tool | Catches |
| -- | -- | -- |
| `lint:code` | oxlint | hook bugs, cycles, long files and functions, deep nesting, `console.log` |
| `lint:complexity` | Biome | cognitive complexity over 15 |
| `lint:types` | tsc | strict types and unused locals |
| `lint:layers` | dependency-cruiser | imports that go up or past a door, libraries in the wrong layer |
| `lint:dupes` | jscpd | copied blocks |
| `lint:unused` | knip | unused files, exports and dependencies |
| `lint:rules` | `scripts/lint/rules.mjs` | files outside the layers, a look in the domain, raw colours and controls, type or spacing outside the tokens |
| `lint:editor` | the package gate | the same tools over `packages/patch-editor` |

Fix the code when a check fails. Do not weaken a rule, and do not add an exception for one file.
`packages/patch-editor/src/engine/generated` is a generated WebAssembly build, so the checks skip it.

Outside the lint gate:

| Command | Tool | Catches |
| -- | -- | -- |
| `npm run build` | size-limit, `.size-limit.json` | a script or style bundle over its budget; the build fails, so no release goes out |
| `npm run screenshots` | Playwright Test | a change to how a primitive or composite looks, section by section on the `?gallery` page; run after a change to the look, then `npm run screenshots:update` when the new look is right |
| `npm run regression` | Playwright | the main journeys on made-up lights, then the real lights |

A new primitive or composite state goes on the gallery page, `src/composites/gallery.tsx`, in the same change.

## Exception: accessibility

This app is for one household, so WCAG conformance and the `AC` rows of the design-system checklist are out of scope
(Ruan, 3 Nov 2026: "i dont care about accessibility though this is only for a household app"). The tap-target size and
the text contrast in the tokens stay, because they are about use on a phone in poor light, not about conformance.
