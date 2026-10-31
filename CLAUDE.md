# Illumigoon remote

The iPhone app for the Illumigoon lights. Capacitor, React, zustand, Base UI.

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

`npm run lint` runs seven checks and reports every failure in one run. CI runs it before each build.

| Script | Tool | Catches |
| -- | -- | -- |
| `lint:code` | oxlint | hook bugs, cycles, long files and functions, deep nesting, `console.log` |
| `lint:complexity` | Biome | cognitive complexity over 15 |
| `lint:types` | tsc | strict types and unused locals |
| `lint:layers` | dependency-cruiser | imports that go up or past a door, libraries in the wrong layer |
| `lint:dupes` | jscpd | copied blocks |
| `lint:unused` | knip | unused files, exports and dependencies |
| `lint:rules` | `scripts/lint/rules.mjs` | files outside the layers, a look in the domain, raw colours and controls |

Fix the code when a check fails. Do not weaken a rule, and do not add an exception for one file.
`src/domain/looks/engine` is a generated WebAssembly build, so the checks skip it.
