# Illumigoon

One app for the Illumigoon lights: control and patch editing, on the iPhone and on the laptop. Capacitor, Electron,
React, zustand, Base UI.

One web build runs in two shells. `electron/main.mjs` is the laptop shell, and it starts the helper process in
`packages/patch-editor/server` that finds lights and holds files. On the iPhone the same `/api` paths are answered in
the page, by `packages/patch-editor/src/phone`, from the same `server/library.mjs`.

`packages/patch-editor` is the editor (LIFE-1885). It has its own lint gate, and the domain is the only layer that
imports it. There is no separate editor to open: Edit is a page of the app, reached from EDIT on a room's look, the
same on both sizes. Its parts move into the three layers below one at a time.

## Standards

The Linear document "Agent rules: project standards" (personal workspace, id `b6c36ef7-9279-4f4e-b193-1aa24da6af98`)
sets the layout, design system, lint, tests and user stories for this repo, and wins over anything here. The design
system audit, its decisions and its README are in `docs/design-system/`.

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
| `lint:rules` | `scripts/lint/rules.mjs` | files outside the layers, a look in the domain, raw colours and controls, type or spacing outside the tokens, a door's component missing from the component page |
| `lint:editor` | the package gate | the same tools over `packages/patch-editor` |

A new export of a door gets a specimen on the component page, `?components` on the dev server, in
`src/domain/screens/component-page` (D68).

`npm run lint:ux` checks how screens and flows feel: too many jobs on a screen, questions before an action, a fact
said twice, slow presses. Run it before you report a change to a screen. It is not in `npm run lint` yet. See
`docs/ux-lint/README.md`.

Fix the code when a check fails. Do not weaken a rule, and do not add an exception for one file.
`packages/patch-editor/src/engine/generated` is a generated WebAssembly build, so the checks skip it.
