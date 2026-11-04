# Design system audit

App or system: Illumigoon, the one app (branch `life-1885-one-app`, HEAD `7f0113e`), with Edit in `packages/patch-editor`
Date: 4 Nov 2026, second run
Checklist version: 2 Nov 2026, 277 rows, plus ST-15 added on 3 Nov 2026 (278 rows)
Earlier audit: `audit-2026-11-04.md` (at `c638a1f`, HEAD `1b8c5ad` audited)
Issues: LIFE-1948, LIFE-1949, LIFE-1950, LIFE-1954, LIFE-1955, LIFE-1956 (under LIFE-1936)

Status is one of: Met, Partly, Missing, Out of scope. Evidence is a file path, token name, lint rule, test or story.
Out of scope needs a reason.

## What changed since the morning

Two batches landed after `audit-2026-11-04.md`:

- `f25406b` to `16c5b77` and `66078ec`: raw-size and raw-line lint over the design system and composites, spacing
  lint over `design-system.css`, enter and exit motion with `Presence`, more contrast and forced colours, screen
  history and `illumigoon://` links, the voice lint, the icon canvas test, D69 to D74.
- `f4589ea` to `c376760` and `7f0113e`: Edit passes axe, fits 320 px, dials and layers by keyboard, Edit's controls
  folder with its own gate (`packages/patch-editor/scripts/edit-rules.mjs`), hover inside `@media (hover: hover)`,
  edges on `--line`, Edit's controls on the component page, the Edit stories, D75 to D80.

Every row that was not Met this morning was checked again, and so was every Met row that these changes touch (the
colour roles, corners, layers, target sizes, reduced motion, the tokens, the lint and the component page).

## Machine checks run on 4 Nov 2026, second run

| Check | Result |
|---|---|
| `npm run lint` (eight checks) | Passed. `lint:rules: no problems`; `edit rules: no problems`; depcruise 147 modules (app) and 169 (Edit), no violations; jscpd 0 clones in both; knip prints its four "redundant entry" hints for `knip.json` only |
| `npx vitest run` | 4 files, 62 tests passed, among them `src/design-system/icons.test.ts` |
| `STORY_PORT=5271 node scripts/regression/run.mjs --only LIFE-1953` | 6 passed: the app at 320 x 640, 375 x 812 and 1440 x 900; Edit at 375 x 812 and 1280 x 800; nothing in Edit scrolls sideways at 320 x 640 |
| `... --only K-` | K-1, K-2 and K-3 passed (K-3: addresses, Back one screen, reload) |
| `... --only NA-17` | A dial steps with the arrows and goes to its ends; a layer moves with the arrow keys. Both passed |
| `... --only axe` | axe finds nothing on Edit, phone and laptop, dark and light. 4 passed |
| `... --only LIFE-1955` | The component page draws every component with no error at 375 x 812 and 1440 x 900 |
| Audit probe: axe (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) on Home, Lounge and Looks, and on Edit under more contrast | No violation in any of 28 runs: phone and laptop, dark and light, contrast `no-preference` and `more` |
| Audit probe: tokens under `prefers-contrast: more` and `forced-colors: active` | More contrast: `--text-3` to `--text-5` move one step up, `--track` 0.12 to 0.45 (dark) and 0.5 (light), `--scrim` 0.72 to 0.9. Forced colours: `--focus` and `--fill` `Highlight`, `--text-4` and `--text-5` `GrayText`, `--track` `CanvasText`; a focused key draws a solid 2 px ring; `.power-key`, `.fader-control` and `.led-strip` take `forced-color-adjust: none` |
| Deliberate violations, then reverted with `git checkout` and a delete | Caught by `npm run lint`: `console.log` and depth (oxlint), complexity 32 (Biome), a type error (tsc), a composite importing the domain (depcruise, also `no-circular`), a copied 133-line block (jscpd), unused exports (knip); in `lint:rules` `height: 33px` (`raw-size`), `box-shadow: inset 0 0 0 1px` (`raw-line`), `max-width: 700px` (`raw-width`), `gap: 3px` in `design-system.css` (`raw-spacing`), `font-size: 13px` (`raw-type`), "palette" and "please" (`voice`), `className` and `style` in the domain (`look-in-domain`), a stray file (`outside-the-layers`), a door export with no specimen (`missing-from-component-page`). Caught by Edit's gate: a raw `<button>` in `Macros.tsx`, a bare `:hover`, an `inset 0 0 0 1px` edge, `height: 44px` (`raw-size`). Not caught: `height: 33px` in Edit's `styles.css`, which equals no token. Edit's gate chains its steps with `&&`, so it stopped at tsc and did not show its other tools failing |
| `var(--name)` search and raw-value searches | No unresolved token. Edit: 34 raw heights and widths in `styles.css`, about 57 inline. `composites.css`: `inset: -15px 0`, `scroll-margin-top: 88px`, `scroll-margin-block: 110px`, `outline-offset: -1px` |

The probe lived in the session's scratch folder and wrote nothing to the repo. Every story and the probe ran on
made-up lights; nothing was sent to a real light. `npm run friction` was not run, since it rewrites
`docs/friction/report.json`; the axe stories and probe stand in for it.

## Summary

| Section | Met | Partly | Missing | Out of scope |
|---|---|---|---|---|
| Brand and identity | 6 | 5 | 2 | 1 |
| Colour | 6 | 6 | 1 | 1 |
| Typography | 7 | 5 | 3 | 0 |
| Geometry | 7 | 3 | 1 | 2 |
| Spacing | 1 | 5 | 3 | 0 |
| Layout | 3 | 5 | 3 | 0 |
| Components | 3 | 5 | 2 | 0 |
| States | 3 | 9 | 3 | 0 |
| Accessibility | 5 | 6 | 5 | 0 |
| Forms | 1 | 18 | 5 | 1 |
| Core data display | 0 | 8 | 5 | 6 |
| Charts | 0 | 0 | 0 | 20 |
| Navigation | 5 | 7 | 2 | 3 |
| Flows | 1 | 11 | 1 | 6 |
| Transitions | 2 | 5 | 4 | 0 |
| Motion | 6 | 3 | 5 | 1 |
| Tokens | 3 | 4 | 1 | 3 |
| Tools | 8 | 3 | 1 | 1 |
| Governance | 2 | 5 | 4 | 0 |
| **All 278 rows** | **69** | **113** | **51** | **45** |

This morning: 52 Met, 125 Partly, 56 Missing, 45 Out of scope. On 3 Nov 2026: 33 Met, 121 Partly, 79 Missing, 45 Out
of scope. The counts come from the rows below, counted by script.

### Rows that changed status since `audit-2026-11-04.md`

| Row | Was | Now | Why |
|---|---|---|---|
| BR-8 | Partly | Met | `ICON_CANVAS` 14 and `ICON_STROKE` 1.2, held by `icons.test.ts` (D74) |
| CO-7 | Missing | Met | `prefers-contrast: more` moves the quiet steps and edges; axe clean under it (D71) |
| CO-8 | Missing | Met | Forced colours map focus, fill and text to system colours; the ring stays (D71) |
| CO-9 | Partly | Met | axe finds no contrast problem in Edit or the app, every theme and width (D75) |
| TY-12 | Partly | Met | `--measure` on the page intro, `--half-column` on the pages, under lint |
| GE-4 | Partly | Met | Box-shadow edges are lint-checked in the app and in Edit; both failed deliberately |
| LA-7 | Partly | Met | Nothing scrolls sideways at 320 px, app and Edit (stories) |
| CM-2 | Partly | Met | One inline message, `LookProblem`; `.warnline` gone (D79) |
| CM-4 | Partly | Met | Edit's `Seg` draws `OptionRow`; `Toggle` wears `Picked` (D77, D78) |
| CM-9 | Partly | Met | Edit's `IconKey`, `Field` and `Choice` need a label; axe clean (D76) |
| ST-5 | Partly | Met | Every `:hover` in `@media (hover: hover)`, held by Edit's gate (D76) |
| AC-2 | Partly | Met | As CO-9 |
| AC-5 | Missing | Partly | Layers move by the arrow keys (D80); lights and modulator tiles still drag only |
| NA-14 | Partly | Met | The two word slips fixed; the voice lint fails the words the app does not use |
| TR-4 | Missing | Partly | Sheets, dialogs and the toast move on tokens (D70); Edit's popovers do not |
| TR-7 | Missing | Met | `--ease-exit` and `--duration-exit`, shorter than enter (D70) |
| MO-2 | Partly | Met | Enter and exit curves; no raw `cubic-bezier` (D70) |
| TL-5 | Partly | Met | `raw-control` in Edit's gate; a raw `<button>` failed (D76) |
| TL-8 | Partly | Met | axe violations empty on Home, Lounge, Looks and Edit |

19 rows changed: 17 up to Met, 2 from Missing to Partly, none down. Rows that kept their status but have new
evidence: CO-3 (`--info` used), GE-1 (unused corners gone), GE-10 and LA-4 (the app clean, Edit not), GE-11 and AC-3
(Edit now in the stories), SP-1, SP-2, TO-2, FO-8, NA-6, NA-7, NA-17, AC-8, CM-7, ST-1, TO-6, TL-9, GO-7, GO-9.

## The issues

| Issue | Rows it names | Met now | Every row Met? | Acceptance holds? | What is missing |
|---|---|---|---|---|---|
| LIFE-1948 editor geometry | SP-1, SP-2, GE-1, GE-7, GE-10, TL-3, TL-5 | GE-1, GE-7, TL-3, TL-5 | No | No. Edit's spacing, corners, layers, edges and controls are tokens and lint-checked, with deliberate failures. Its sizes are not: Edit's `raw-size` fails only a value equal to a token | GE-10: 34 raw heights and widths in Edit's `styles.css`, about 57 inline, and `height: 33px` passes Edit's gate. SP-1: raw offsets (`top`, `left`, `right`, `bottom` of 1 to 7 px in `styles.css`; `inset: -15px 0`, two `scroll-margin` values and `outline-offset: -1px` in `composites.css`). SP-2: `--space-half` used for gaps between rows of a column in eight places in Edit |
| LIFE-1949 token groups | TO-2, GE-4, GE-7, MO-1, MO-2, LA-1 | GE-4, GE-7, MO-1, MO-2, LA-1 | No | No, by one row. Each group exists and is used | TO-2: four raw values in `composites.css` that no rule reads: `inset: -15px 0`, `scroll-margin-top: 88px`, `scroll-margin-block: 110px`, `outline-offset: -1px` |
| LIFE-1950 duplicated components | CM-2, CM-4, BR-8 | CM-2, CM-4, BR-8 | Yes | Yes. One component per job in the design system or composites, and the rows are Met | Nothing for these rows |
| LIFE-1954 addresses and keyboard | NA-7, NA-17, LA-7 | LA-7 | No | No. Each row has a test (K-3, the two NA-17 stories, the LA-7 stories), but two rows are not Met | NA-7: cold-opening an `illumigoon://` link on the iPhone is untried. NA-17: lights in a list and Edit's modulator tiles have no key route; Edit's `Tabs` take no arrow keys |
| LIFE-1955 component page | TL-2, ST-1, CM-7 | TL-2 | No | No. The page now holds Edit's controls too, but not every state | ST-1: no hover or focus cell, loading and error on a few components only. CM-7: no anatomy, sizes, behaviour, keyboard, ARIA or do and don't |
| LIFE-1956 brand and voice | BR-1, BR-4, BR-5, BR-6 | BR-1, BR-4 | No | No. The rules are written and the app's words are checked | BR-5: no sentence-length or casing check; Edit's words are not scanned; Edit's colour fields show hex codes. BR-6: Edit says "palette" for a layer's colours outside its palette store (`ColourBodies.tsx`) |

## Remaining gaps, by how much a person using the app would notice them

1. **Back and links on the iPhone.** Back now walks the history on the laptop and in a browser, but nothing turns on
   the iPhone web view's back swipe, and no `illumigoon://` link has been opened on the phone (NA-6, NA-7).
2. **Full text only in `title`.** Edit keeps 80 `title` texts, which a finger cannot reach, so cut-off names stay
   cut off on the phone (CM-8, DA-14).
3. **Words in Edit.** Colour fields show hex codes, Edit says "palette" for a layer's colours, and the save form
   names its fields only by placeholder (BR-5, BR-6, FO-1).
4. **Edit's menus pop.** Sheets, dialogs and the toast now glide in and out; Edit's menus and popovers still
   appear in one frame, and there is no table of transitions (TR-4, TR-1).
5. **Drag-only moves.** Lights in a list and Edit's modulator tiles move only by drag; Edit's tabs take no arrow
   keys (AC-5, CM-10, NA-17, AC-8).
6. **Two undo times.** The app's undo stays 10 s, Edit's 6 s (ST-13, AC-14).
7. **Device checks.** Type, Dynamic Type, safe areas, VoiceOver, Increase Contrast and frame rate wait for the
   iPhone (TY-8, TY-15, LA-3, AC-11, MO-13).
8. **Sizes and offsets in code.** Edit's raw heights and widths, raw offsets in composites and Edit, and
   `--space-half` between rows. A person does not see these, but they let sizes drift (GE-10, SP-1, SP-2, TO-2,
   LA-4, DA-1).
9. **The system's own records.** No anatomy or keyboard fields on the component page, Edit outside the voice lint by
   a code comment only, Edit's gate stopping at its first failure, no contrast script over token pairs (ST-1, CM-7,
   GO-7, GO-9, TL-11).

## Rows

### Brand and identity

| ID | Status | Evidence | Note |
|---|---|---|---|
| BR-1 | Met | `docs/design-system/voice.md`, "Principles" | Five principles, each with a meaning, what follows from it and where it shows now: light is the picture, lit means live, flat, say a thing once, no small print |
| BR-2 | Partly | `decisions.md` D1; `docs/design-system/voice.md` | Product UI rules and brand words live in `docs/design-system`. No marks or marketing rules anywhere |
| BR-3 | Missing | `.wordmark` in `composites.css` | The wordmark is styled text. No mark files, clear space, minimum size or misuse list |
| BR-4 | Met | `voice.md`, "Voice" | Tone by moment (label, look, state, error, waiting, asking), with app examples and a do-not list. A search of UI strings in `src/domain/screens`, `src/composites` and Edit's `ui` finds no exclamation mark, "Oops" or "Successfully" |
| BR-5 | Partly | `scripts/lint/rules.mjs` `voice` (D73); a deliberate "Pick a palette please" failed on 4 Nov | Lint finds banned words, US spelling, 12-hour times and exclamations in the words the app shows. Nothing checks sentence length or casing. Edit's words are not scanned, and Edit's colour fields (`input.hexin`, `ColourBodies.tsx`) show hex codes, which the style rules bar |
| BR-6 | Partly | `voice.md` "Words"; `voice` lint; a search for each listed word | Both slips are fixed ("Name of the colours", "every light on its network"), and "device" in the app now only means the phone or laptop. Edit says "palette" for a layer's colours outside its palette store (the `Palette` heading and "Edit the palette every layer plays" in `ColourBodies.tsx`), and no check reads Edit's words |
| BR-7 | Missing | | No naming convention for products or components |
| BR-8 | Met | `ICON_CANVAS` 14, `ICON_STROKE` 1.2, round caps and joins and `fill="none"` in `IconFrame` (`icons.tsx`); `icons.test.ts` (D74) | Every icon of the set is on one canvas with one line and no opacity, held by a test in `npx vitest run`. Edit's wave drawings take their own canvas as drawings, by D74. One size only, so no per-size rule is needed yet |
| BR-9 | Partly | `Icon.Grip`, `Icon.Power`, `Icon.Dice`, `Icon.Back`, `Icon.Unlock` | Named for the object. No written rule and no alias rule |
| BR-10 | Partly | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` | One appearance only. No dark, clear or tinted versions. No Windows icon rule |
| BR-11 | Out of scope | | The app uses no illustrations. The LED strip drawing is content |
| BR-12 | Met | `voice.md`, "Media and senses" | "The app uses none. A light is shown by its strip drawing, never by a photo" |
| BR-13 | Met | `voice.md`, "Media and senses" | Haptics: none, and the code makes no haptic call. A press shows by the key moving |
| BR-14 | Met | `voice.md`, "Media and senses" | Sounds: none |

### Colour

| ID | Status | Evidence | Note |
|---|---|---|---|
| CO-1 | Partly | `design-system.css` `:root` | D3 chosen: steps by job. Values are picked by hand, not made by one method |
| CO-2 | Partly | `--text-1` to `--text-5`, `--background` | Near grey with a faint warm tint. No stated chroma limit |
| CO-3 | Met | `--good: var(--text-1)`, `--info: var(--text-3)`, `--warn: var(--text-2)`, `--bad` in `design-system.css`, both themes | Neutral roles, danger alone has a hue, no orange or amber. All four are used: `--info` now colours `.bottom-notice` (D71). No accent ramp, by the owner's rule |
| CO-4 | Partly | `--background`, `--text-*`, `--track`, `--wash`, `--fill`, `--focus`, `--on-fill`; `lint:rules` `raw-colour` | No raw ramp, so components use roles, and lint blocks raw colour in composites, domain and Edit's sheet. Names are numbered, not by intent. No accent role |
| CO-5 | Met | `--on-fill: var(--background)`; `.toast` in `composites.css`; `.power-key[data-checked] .power-key-thumb` | The one solid fill is ink (`--fill`), and paper on ink passes in both themes (axe found no toast or switch problem) |
| CO-6 | Met | `@media (prefers-color-scheme: light)` in `design-system.css` | Every role has a light value, directly or by reference; the new roles reference ramp roles. Edit reads the same tokens |
| CO-7 | Met | `@media (prefers-contrast: more)`, dark and light, in `design-system.css` (D71); audit probe | With more contrast emulated, `--text-3` to `--text-5` move one step up the ramp and `--track` and `--scrim` grow (dark `--track` 0.12 to 0.45). axe finds nothing on Home, Lounge, Looks and Edit under more contrast, both themes, both widths. Not tried with the iPhone's own Increase Contrast |
| CO-8 | Met | `@media (forced-colors: active)` in `design-system.css` and `composites.css`; `forced-color-adjust: none` on the switch, fader, marks, strips and swatches (D71); audit probe | With forced colours emulated, `--focus` and `--fill` are `Highlight`, quiet text is `GrayText`, and a focused key draws a solid 2 px ring. The switch, fader and strips keep their fills. Icons draw in `currentColor`. Not tried under Windows contrast themes themselves |
| CO-9 | Met | Four stories "axe finds nothing on Edit"; audit probe on Home, Lounge and Looks, 4 Nov | No `color-contrast` problem anywhere tried: dark and light, phone and laptop, with and without more contrast. D75 lifted Edit's words to `--text-4` |
| CO-10 | Missing | | No wide-gamut rule. All tokens are sRGB |
| CO-11 | Partly | Chrome tokens are neutral; `voice.md` "The light is the picture" | Peak colour only in LED strips and palettes. The principle says so, but names no role |
| CO-12 | Partly | `.screen-page::before`, sticky heads on solid `--background` | Chrome is monochrome on solid backgrounds. Not checked with a bright strip under it |
| CO-13 | Out of scope | | No data charts. Edit's band scope is a live signal, not a chart |
| CO-14 | Partly | `src/design-system/colour.ts`, `--led-off`, `led-strip.tsx`; `voice.md` principle 1 | LED colour is handled in code. How LED colour maps to the screen is not written |

### Typography

| ID | Status | Evidence | Note |
|---|---|---|---|
| TY-1 | Partly | `--sans`, `--mono` | D11 chosen. Computed font not checked on iPhone and Windows |
| TY-2 | Met | `--type-label`, `--type-small`, `--type-small-sans`, `--type-value`, `--type-note`, `--type-body`, `--type-heading`; `lint:rules` `raw-type` | D54 cut the roles to seven. Lint checks type in composites, the design system, Edit's sheet and Edit's inline styles: no problems |
| TY-3 | Partly | `.patch-editor { font-size: var(--size-note) }`; `--type-body` | D7 chose Edit's base. App body text stays at `--size-body` |
| TY-4 | Met | `--size-small: 0.6875rem`; `lint:rules` `raw-type` | The smallest size is 11 px, and lint keeps every font on the tokens |
| TY-5 | Met | `--size-*` in rem; unitless line heights in `--type-*` | Unchanged since the 3 Nov check |
| TY-6 | Met | `--tracking-label`; `lint:rules` covers `letter-spacing` | D54 removed `--tracking-title`. Tracking comes from the one token |
| TY-7 | Met | `index.html` viewport | Zoom allowed; text reflows at 200% (TY-5) |
| TY-8 | Partly | | D10 chosen: not followed. Not checked on a device |
| TY-9 | Partly | `--type-value` on `--mono` | Values in Geist Mono. No `tabular-nums` anywhere |
| TY-10 | Partly | `src/design-system/index.ts` imports `@fontsource/geist` 400, 500 and `geist-mono` 400, 500 | WOFF2 packages. Not checked in the packaged builds |
| TY-11 | Met | `--weight-regular`, `--weight-medium`; font imports 400 and 500 | D54 removed the 300 weight and its file; each declared weight has a file |
| TY-12 | Met | `--measure` ("How wide a page's intro may run") on `.page-intro`; `--half-column` on every page | Reading text sits in the half column, and intros on `--measure`. Lint keeps the width a token |
| TY-13 | Missing | | No text-spacing test in the repo |
| TY-14 | Missing | | No `size-adjust` fallback face |
| TY-15 | Missing | | No review on iPhone and Windows recorded |

### Geometry

| ID | Status | Evidence | Note |
|---|---|---|---|
| GE-1 | Met | `--radius`; `lint:rules` `raw-spacing` covers `border-radius` in composites, the design system, Edit's sheet and Edit's inline styles | One corner for every role. D71 removed the unused `--radius-pill` and `--radius-round` |
| GE-2 | Missing | | No nesting rule |
| GE-3 | Out of scope | | No squircles or `corner-shape` |
| GE-4 | Met | `--line`, `--line-strong`, `--line-thick`, `--mark-line`, `--focus-line`; `raw-line` over the CSS and inline styles of the design system and composites; Edit's `raw-edge` (D69, D76) | A deliberate `box-shadow: inset 0 0 0 1px` failed in `composites.css` and in Edit's `styles.css` on 4 Nov. Edit's edges are now `inset 0 0 0 var(--line)` |
| GE-5 | Met | `--push-shadow`, `--lift-shadow`, `--float-shadow` | Each shadow named for its job and used through the token |
| GE-6 | Partly | `--wash`, `--wash-strong` | D14 chosen. Not checked by eye in dark |
| GE-7 | Met | `--layer-raised` to `--layer-float`, `--layer-over-editor`, `--layer-editor-*`; `lint:rules` `raw-layer` | Every `z-index` in both sets is a token (21 uses, none raw). Deliberate `z-index: 7` failed on 4 Nov |
| GE-8 | Out of scope | | No translucent materials or blur |
| GE-9 | Met | `--focus`, `--focus-line`, `--focus-gap`, `:focus-visible` in `design-system.css`; `.toast :focus-visible` | One ring. K-1 and K-2 reach every stop by Tab |
| GE-10 | Partly | `--row`, `--row-tall`, the size group (`--home-header` to `--strip-line`); `raw-size` (D69); Edit's `raw-size` (D76) | The app's layers have no raw height or width, and a deliberate `height: 33px` failed there. Edit still writes 34 raw heights and widths in `styles.css` (22, 28, 40, 70, 170 px and more) and about 57 inline (`matrixSheet.tsx`, `LayerStack.tsx`, `inspector.tsx`). Its rule fails only a value that equals a token, so `height: 33px` passes in Edit |
| GE-11 | Met | Rule in `design-system.css` and `styles.css`; LIFE-1953 stories | App: no control under 44 px at 320, 375 and 1440 px. Edit: none under 44 px at 375 x 812 and none under `--pointer-target` at 1280 x 800, in every section. All passed on 4 Nov |
| GE-12 | Partly | `--dialog-width`, `--dialog-wide` in `.dialog` | Dialogs and sheets use size tokens; full screen on the phone. `max-height: 84vh` is raw, and Edit's `.surfacemenu` and `.surfacepop` size to their content |
| GE-13 | Met | `voice.md` "Flat: hairlines (`--line`, `--track`) divide"; D57; `styles.css` header | The rule is written, and `.heading-row`, `.hr`, `.vr` follow it |

### Spacing

| ID | Status | Evidence | Note |
|---|---|---|---|
| SP-1 | Partly | `--space-half`, `--space-1` to `--space-7`; `raw-spacing` now also over `design-system.css` (D69); a deliberate `gap: 3px` there failed on 4 Nov | `gap: 1.5px` is gone. Raw offsets that no rule reads remain: `inset: -15px 0` (`.wordmark::after`), `scroll-margin-top: 88px`, `scroll-margin-block: 110px` and `outline-offset: -1px` in `composites.css`; `top`, `left`, `right` and `bottom` of 1 to 7 px in Edit's `styles.css` (lines 462, 463, 513, 721, 722, 771) |
| SP-2 | Partly | `--space-half` and its list of uses (D69) | The list now covers the `.seg` rows and the scrollbar thumb. Outside it: gaps between rows of a column in Edit (`ColourBodies.tsx:167`, `modEditor.tsx:389`, `Randomise.tsx:242`, `Surface.tsx:558`, `Sheet.tsx:130`, `SignalChain.tsx:257`) and row padding (`controlEditor.tsx:282`, `Macros.tsx:180`) |
| SP-3 | Missing | | No usage bands |
| SP-4 | Partly | `--section`, `--gutter`; D64 | The room now uses `--space-5` between sections, other pages `--section`. Two section gaps |
| SP-5 | Partly | `composites.css` uses `gap` on parents | `.library-group > .heading-row` and `.note` carry negative bottom margins; `.page-section` a top margin |
| SP-6 | Missing | | No grouping rule |
| SP-7 | Partly | `@media (max-width: 899px)` in `styles.css` | D13 chosen. Edit lifts on the phone; the app has no lift |
| SP-8 | Met | `--edge`; `calc(-1 * var(--space-*))` in `styles.css` (`.rowgrip`, `.fader`) and `composites.css`; `raw-spacing` lint | Every overlap is a token |
| SP-9 | Missing | | No rule |

### Layout

| ID | Status | Evidence | Note |
|---|---|---|---|
| LA-1 | Met | `--wide: 900px`; `src/design-system/layout.ts` `WIDE`; `lint:rules` `raw-width` | Every media query width in both sets is checked against `--wide`. No device check |
| LA-2 | Missing | | No columns or grid per width |
| LA-3 | Partly | `--gutter`, `--page-top`, `env(safe-area-inset-*)` | Not checked on a device |
| LA-4 | Partly | `--half-column`, `--side-column`, `--dialog-width`, `--measure`, `--scene-card` | The app's content uses width tokens now, under lint. Edit's panels write raw widths (`inspector.tsx` 348, `LayerStack.tsx` 276, the `matrixSheet.tsx` columns) |
| LA-5 | Missing | | No `@container` queries |
| LA-6 | Partly | `screen-stack.tsx` | Home beside the room is list-detail. No named-layout table |
| LA-7 | Met | Stories "LIFE-1953 every control is at least 44 px and nothing scrolls sideways at 320 x 640" and "LIFE-1953 nothing in Edit scrolls sideways at 320 x 640" | Both passed on 4 Nov. A selected layer's keys take a second line on the phone (b36e296) and Edit's section row fits (7f0113e) |
| LA-8 | Met | `scripts/regression/stories/tap-targets.mjs` `PLACES` | The same 21 places, Home to Light setup, are reached by the same taps at 375 and 1440 px. K-1 and K-2 run on the laptop |
| LA-9 | Partly | `.dialog` `100dvh` on the phone, `84vh` on the laptop | No rule. Not tested with the keyboard up |
| LA-10 | Missing | | No landscape rule |
| LA-11 | Partly | `electron/main.mjs` | Window, minimum size and menus set. No written rule |

### Components

| ID | Status | Evidence | Note |
|---|---|---|---|
| CM-1 | Partly | `keys.tsx`, `text-field.tsx`, `fader.tsx`, `dialog.tsx`, `OptionRow`; Edit `Tabs`, `.check`, native `select` | Button, switch, field, slider, dialog, choice row in the design system. Checkbox, tabs and select live only in Edit. Tooltip, popover, menu, progress, spinner have no decision |
| CM-2 | Met | `Toast` (D46), `BottomNotice`, `Sheet` on `Dialog` (D45), `LookProblem` (D79); Edit confirmations through `editor-dialogs.tsx` | One form for each job. Edit's `.warnline` is gone, and its inline messages are `LookProblem` |
| CM-3 | Partly | Edit `.row`, `.col`, `.grow` | No layout primitives in the design system |
| CM-4 | Met | D44 to D50, D77, D78: `Fader`, `Sheet`, `Toast`, `Swatch`, `Picked`, `Icon`, `OptionRow`, `LookProblem` | Edit's `Seg` draws `OptionRow`. One selected mark, `Picked`, on Edit's `Toggle`, `Tabs` and `Seg` and on the app's `ChoiceList` and `ColourSlot`; a chosen colour slot also widens beside its mark. No second shell or inline message found |
| CM-5 | Partly | `@base-ui/react` in `fader.tsx`, `keys.tsx`, `dialog.tsx` | Slider, switch and dialog come from it. `Press`, Edit's `Key` (`ui/controls/keys.tsx`, kept by D76) and Edit's dials (its own `slider`, `useKnobKeys.ts`) do not |
| CM-6 | Missing | `ColourPad`, `FileKey`, Edit `Seg` | No in, out or deferred list |
| CM-7 | Partly | `?components`, now with Edit's `Pill`, `IconKey`, `Toggle`, `Seg`, `Knob`, `Field`, `Choice` (`packages/patch-editor/src/ui/specimens.tsx`) | Each component shows its states. No anatomy, sizes, behaviour, keyboard, ARIA or do and don't |
| CM-8 | Missing | 80 `title=` attributes in Edit's `ui`; `IconKey` puts its name in `title` as well | Full text sits in `title`, which touch cannot reach |
| CM-9 | Met | `IconKey`, `Field`, `Choice` need a `label` (D76); `Press` `label`; `IconFrame` `aria-hidden`; axe stories | axe finds no `label` or name problem in Edit or the app on 4 Nov; the three hex fields are "Colour 1 code" and on |
| CM-10 | Partly | `drag-order.ts`, `LightDragList`, Edit `useRowDrag.ts`; a layer's grip is a key (D80) | Layers move by the arrow keys. Lights in a list and Edit's modulator tiles (`dock.tsx` `tileDrag`) move only by drag |

### States

| ID | Status | Evidence | Note |
|---|---|---|---|
| ST-1 | Partly | `?components`, with Edit's controls in their states; LIFE-1955 stories | Default, pressed, held, quiet, disabled, empty, long text, and now Edit's controls. No hover or focus cell; loading and error only on a few |
| ST-2 | Met | `--wash`, `--wash-strong`, `--modulation-ghost`, `--opacity-disabled`, `--opacity-behind`, `--opacity-quiet`; `raw-layer` and `raw-colour` lint | Every state colour and opacity in both sets is a token |
| ST-3 | Partly | `button:disabled { opacity: var(--opacity-disabled) }`; Edit `.pill:disabled` `--text-5` | D17 chosen. Two treatments. Disabled controls do not explain themselves |
| ST-4 | Partly | | D18 chosen: disable. Labels still change while working |
| ST-5 | Met | Edit `scripts/edit-rules.mjs` `hover-without-a-mouse` (D76); every `:hover` in `styles.css` inside `@media (hover: hover)`; no `:hover` in the app's CSS | A deliberate bare `:hover` failed on 4 Nov |
| ST-6 | Partly | D67 search screen; "No lights are answering"; `LookProblem` | Empty states exist. No table of kinds |
| ST-7 | Partly | `voice.md` "Something went wrong: no blame" | No empty-state wording rule of its own |
| ST-8 | Missing | | D19 chosen. No timer delays an indicator |
| ST-9 | Missing | | No skeletons |
| ST-10 | Partly | Edit `.catalog-fail`, `Boundary.tsx` | App update shows the raw error |
| ST-11 | Missing | | No rule |
| ST-12 | Partly | `.status-mark[data-state='silent']`; D56 | One wording for a silent light. No rules for stale or offline |
| ST-13 | Partly | `Toast` (D46); `UNDO_MS = 10000` in `store/undo.ts`, `SHOW_UNDO_MS = 6000` in Edit `useToast.ts` | One toast, one at a time. Two durations |
| ST-14 | Partly | `app-update.ts` `useUpdateError` sets `error.message`; Edit `attempt()` shows `e.message` | Raw error text can reach the screen |
| ST-15 | Met | The list in `audit-2026-11-03.md`; D56, D58, D59, D66 | Since 3 Nov: one wording for a light's state, the shared plays-on note said once, the open room marked once, Edit's second live mark gone |

### Accessibility

| ID | Status | Evidence | Note |
|---|---|---|---|
| AC-1 | Partly | `scripts/friction/measure.mjs` tags | The checks aim at AA. No written target |
| AC-2 | Met | Four axe stories on Edit; audit probe on Home, Lounge and Looks | No contrast problem in any theme, width or contrast setting tried on 4 Nov |
| AC-3 | Met | LIFE-1953 stories (six) | App: no control under 44 px at 320, 375 and 1440 px. Edit: none under 44 px on the phone and none under 24 px on the laptop. Edit is in the stories now. axe `target-size` passes |
| AC-4 | Met | `:focus-visible` in both sheets; K-1, K-2 | Ring on every stop; Tab reaches each control |
| AC-5 | Partly | D80; story "NA-17 a layer moves down the stack with the arrow keys" | Layers reorder without a drag. Lights in a list (`LightDragList`) and Edit's modulator tiles have no single-pointer route |
| AC-6 | Partly | TY-5, TY-7; LA-7 stories | 200% text and 320 px pass, app and Edit. No text-spacing test (TY-13) |
| AC-7 | Partly | | No sign-in. Redundant entry and help order not checked |
| AC-8 | Partly | Base UI `Slider`, `Switch`, `Dialog`; K-2; Edit dials are `slider` (`useKnobKeys.ts`, D80) with the NA-17 story | Dialog and dial keys pass: arrows, Shift, Page keys, Home and End. Edit's `Tabs` are pressed buttons, not a tab list with arrow keys |
| AC-9 | Met | `prefers-reduced-motion`, `prefers-contrast`, `forced-colors` in `design-system.css` and `composites.css` | D36 and D71 built. Each changes the page (CO-7, CO-8, TR-11) |
| AC-10 | Partly | `.status-mark` solid, grey and dashed (D51) | Shapes back up colour. No greyscale check |
| AC-11 | Missing | | No VoiceOver pass |
| AC-12 | Missing | | No skip link or hidden-text utility |
| AC-13 | Met | `Toast` `role="status" aria-live="polite"` (`toast.tsx`), `BottomNotice` | Live regions for the toast and notice. No `aria-busy` |
| AC-14 | Missing | `UNDO_MS`, `SHOW_UNDO_MS` | No rule |
| AC-15 | Missing | | No manual pass recorded |
| AC-16 | Missing | `index.html` `lang="en"` | No locale or direction decision |

### Forms

| ID | Status | Evidence | Note |
|---|---|---|---|
| FO-1 | Partly | `.control-label` (D55); Edit `Field` needs a `label` | App labels sit above. Every Edit field has a name, but the colour fields' name is not visible and the save form (`RailSaveForm.tsx`) shows only placeholders |
| FO-2 | Partly | `.note` under fields | Short in practice. No rule |
| FO-3 | Partly | | D21 chosen. No optional field carries the mark |
| FO-4 | Partly | `SheetBody` | One column in the app. Edit popover fields not checked |
| FO-5 | Missing | | No width rule |
| FO-6 | Partly | `ControlGroup` | D23 chosen. Not named per flow |
| FO-7 | Partly | `own-wifi-form.tsx` | D22 chosen. No error display |
| FO-8 | Partly | `voice` lint over the words the app shows (D73); `voice.md` do-not list | A script now fails "please", "oops" and "successfully" in the app. It does not scan Edit, and "sorry", "invalid" and "This field is required" are not on its list |
| FO-9 | Missing | | Not tested |
| FO-10 | Missing | | Not checked |
| FO-11 | Partly | Faders and switches send at once; Edit `useKeptDraft.ts` | D24 chosen. Not checked form by form |
| FO-12 | Partly | `useKeptDraft.ts`, `markUndoSaved` | No unsaved-changes test |
| FO-13 | Partly | `ActionKey`; `SheetFooter`; sheet head keys (D45) | No placement rule |
| FO-14 | Partly | `StepperRow` | No `inputmode` anywhere |
| FO-15 | Partly | `LevelRow` value | No range rule |
| FO-16 | Partly | `PowerKey`; Edit `Switch` draws it (D66) | App switches act at once. Edit switches change the draft |
| FO-17 | Partly | Edit native `select` (`.blendchip`, `select.popin`) | No select or combobox rule |
| FO-18 | Missing | `schedules-page.tsx` | Typed time entry not checked |
| FO-19 | Partly | `FileKey` | Button only. No limits or errors |
| FO-20 | Out of scope | | Nothing takes typed tags |
| FO-21 | Partly | `spellCheck` in places | No `autocomplete` anywhere |
| FO-22 | Met | `--size-field` under `@media (pointer: coarse)` | 16 px fields on touch. Not tried on the iPhone |
| FO-23 | Missing | | No keyboard mode set |
| FO-24 | Partly | `store/undo.ts`; Edit `confirmDelete` "Delete X? Nothing brings it back." | Undo first. Confirmation names the item and the cost; its keys are not checked for outcome labels |
| FO-25 | Partly | Edit `.kunit` | Not checked for screen readers |

### Core data display

| ID | Status | Evidence | Note |
|---|---|---|---|
| DA-1 | Partly | `--row`, `--row-tall` | App rows use tokens. Edit rows have raw heights (GE-10) |
| DA-2 | Out of scope | | No sortable tables |
| DA-3 | Out of scope | | No bulk selection |
| DA-4 | Partly | `look-library.tsx` | D25 chosen. Not named per list |
| DA-5 | Partly | `.level-value`, `--mono` | No tabular figures rule |
| DA-6 | Out of scope | | No tables with cells, apart from Edit's matrix, which has no empty cells |
| DA-7 | Partly | Edit `.rowacts`, `.libacts` | Touch alternatives exist. No rule |
| DA-8 | Partly | `styles.css` phone query | D26 chosen. No locked header |
| DA-9 | Missing | | No rule |
| DA-10 | Missing | | No `Intl.NumberFormat` |
| DA-11 | Partly | `toLocaleTimeString` in `history-page.tsx`, `room-summary.tsx`, `store/schedules.ts` | Three formatters, not one |
| DA-12 | Missing | | No relative-time rule |
| DA-13 | Missing | | Not checked |
| DA-14 | Partly | ellipsis and `line-clamp` | Full text is in `title` in Edit (CM-8) |
| DA-15 | Partly | `LookSearch`; D67 | Clear and Escape not checked |
| DA-16 | Out of scope | | No filters |
| DA-17 | Out of scope | | No autosuggest |
| DA-18 | Out of scope | | No virtual lists |
| DA-19 | Missing | `RoomCard`, `SceneCard`, `InfoRow` | No rule |

### Charts

All 20 rows are out of scope: the product has no data charts. Edit's band scope and live meters show a signal as it
plays. D27 to D29 stay chosen in case a chart arrives.

| ID | Status | Evidence | Note |
|---|---|---|---|
| CH-1 | Out of scope | | No data charts |
| CH-2 | Out of scope | | No data charts |
| CH-3 | Out of scope | | No data charts |
| CH-4 | Out of scope | | No data charts |
| CH-5 | Out of scope | | No data charts |
| CH-6 | Out of scope | | No data charts |
| CH-7 | Out of scope | | No data charts |
| CH-8 | Out of scope | | No data charts |
| CH-9 | Out of scope | | No data charts |
| CH-10 | Out of scope | | No data charts |
| CH-11 | Out of scope | | No data charts |
| CH-12 | Out of scope | | No data charts |
| CH-13 | Out of scope | | No data charts |
| CH-14 | Out of scope | | No data charts |
| CH-15 | Out of scope | | No data charts |
| CH-16 | Out of scope | | No data charts |
| CH-17 | Out of scope | | No data charts |
| CH-18 | Out of scope | | No data charts |
| CH-19 | Out of scope | | No data charts |
| CH-20 | Out of scope | | No data charts |

### Navigation

| ID | Status | Evidence | Note |
|---|---|---|---|
| NA-1 | Met | `decisions.md` D30 | One top level: Home |
| NA-2 | Met | `tap-targets.mjs` `PLACES` at 375 and 1440 px | Every destination is reached at both widths |
| NA-3 | Out of scope | | No tab bar |
| NA-4 | Out of scope | | No sidebar with levels |
| NA-5 | Met | `screen-stack.tsx` | No hidden menu |
| NA-6 | Partly | `src/domain/store/screen-history.ts` (D72); K-3 | Back walks back one screen at a time in the browser and on the laptop, and the app's own back goes through the same history. On the iPhone nothing turns on the web view's back swipe, so the system gesture is not tried; needs the device |
| NA-7 | Partly | `screen-history.ts` `appUrlOpen`, `getLaunchUrl`; `illumigoon` scheme in `ios/App/App/Info.plist` (D72); K-3 | Each screen has an address; a typed address and a reload open it, and Back walks back (K-3, passed 4 Nov). Cold-opening an `illumigoon://` link waits for the iPhone |
| NA-8 | Partly | `screen-stack.tsx` keeps screens mounted | D32 chosen. Not tested |
| NA-9 | Out of scope | | Two levels deep, no breadcrumbs |
| NA-10 | Partly | Edit `.surfacemenu` | One tier seen |
| NA-11 | Partly | `Sheet` on `Dialog`; Edit `.surfacepop` | D31 chosen. No stacked-overlay check |
| NA-12 | Missing | | No detents, grabber or swipe dismissal |
| NA-13 | Missing | | No command palette decision |
| NA-14 | Met | `voice.md` "Words"; `voice` lint; a search for "device" in the app | Labels are plain words of the list. The two slips of the morning are fixed, and the lint fails the words the app does not use |
| NA-15 | Partly | `src/design-system/hold.ts` | Hold has tap as its equal. Not written |
| NA-16 | Met | | No rule cites thumb zones |
| NA-17 | Partly | K-1, K-2; stories "NA-17 a dial in Edit steps" and "NA-17 a layer moves" | Home, room, Looks, a sheet, a dial and a layer by keyboard alone. Lights in a list and Edit's modulator tiles have no key route, and Edit's `Tabs` take no arrow keys |

### Flows

| ID | Status | Evidence | Note |
|---|---|---|---|
| FL-1 | Partly | `docs/user-stories/README.md`, `journeys.mjs` | Stories with steps. Not typed pages |
| FL-2 | Met | `home-screen.tsx` | No onboarding |
| FL-3 | Out of scope | | No accounts |
| FL-4 | Partly | `home-screen.tsx` names Local Network | Prompt timing not checked |
| FL-5 | Partly | `+ ADD A LIGHT` on Home | Not checked as a flow |
| FL-6 | Partly | `rename-look-sheet.tsx`, `save-scene-sheet.tsx`, `store/undo.ts` | Not checked per object |
| FL-7 | Partly | `store/undo.ts`; Edit `useHistory.ts` | D33 chosen. Not checked per act |
| FL-8 | Partly | D67 search screen; `look-library.tsx` | The light search says what to do. Looks says "No look matches ..." with no way out |
| FL-9 | Out of scope | | No bulk actions |
| FL-10 | Out of scope | | No notifications |
| FL-11 | Partly | `room-settings-page.tsx` | No rule |
| FL-12 | Missing | `paste-look-sheet.tsx` | No rule |
| FL-13 | Partly | Silent lights | No rule |
| FL-14 | Partly | `app-update.ts`, `light-software-page.tsx` | No forced or optional rule |
| FL-15 | Out of scope | | No accounts |
| FL-16 | Out of scope | | No purchases |
| FL-17 | Out of scope | | No accounts |
| FL-18 | Partly | Edit `Boundary.tsx`; `openAddress` | Addresses exist now, but an unknown address has no not-found page |
| FL-19 | Partly | `docs/user-stories`, `scripts/regression/stories` | Stories are tests. No flow list links them |

### Transitions

| ID | Status | Evidence | Note |
|---|---|---|---|
| TR-1 | Missing | `.screen` transition | No table |
| TR-2 | Missing | | No rule |
| TR-3 | Partly | `--duration-*`; `raw-motion` lint | Durations are tokens, and a deliberate `120ms` failed. No spec per transition kind |
| TR-4 | Partly | `.dialog`, `.dialog-scrim`, `.toast` on `--ease-enter`, `--duration-enter`, `--ease-exit`, `--duration-exit`; `Presence` (D70) | Sheets, dialogs and the toast come and go with token motion. Edit's `.surfacemenu` and `.surfacepop` still appear in one frame |
| TR-5 | Partly | `--push` | Sheets do not follow the finger |
| TR-6 | Partly | `rise-in`, `sink-out` move by `--space-2` | No `scale(0)` anywhere. No origin rule for popovers |
| TR-7 | Met | `--ease-exit` (accelerating), `--duration-exit` 140 ms against `--duration-enter` 200 ms (D70) | Used by `.dialog`, `.dialog-scrim` and the toast |
| TR-8 | Partly | `[data-sorting] > *` | Reorder moves. No rule |
| TR-9 | Missing | `.fader-fill`, `.power-key` transitions | Not turned off for a theme switch |
| TR-10 | Missing | | No view transitions decision |
| TR-11 | Met | `prefers-reduced-motion` in `design-system.css`, `composites.css` | D36. Each movement has a fade or a static form; the new dialog and toast motion only fades (D70) |

### Motion

| ID | Status | Evidence | Note |
|---|---|---|---|
| MO-1 | Met | `--duration-press`, `--duration-settle`, `--duration-push`, `--duration-glow`, each with its use in `design-system.css`; `raw-motion` lint | No raw duration in either set |
| MO-2 | Met | `--push`, `--ease-out`, `--ease-enter`, `--ease-exit` | Standard, enter and exit curves. The only `cubic-bezier` values in both sets are the tokens |
| MO-3 | Met | CSS transitions only | D34 |
| MO-4 | Partly | `.screen` on `transform` and `opacity` | `.colour-slot` animates `flex-grow` |
| MO-5 | Missing | | No rule |
| MO-6 | Missing | | No rule |
| MO-7 | Met | `button` transition `var(--duration-press)` (140 ms) | Press feedback sits in the 50 to 150 ms band |
| MO-8 | Partly | `button[data-held='true']` | D37 chose a colour layer and no scale. The app still lifts and scales a held key |
| MO-9 | Missing | | No rule |
| MO-10 | Partly | `led-strip-player.ts` `viewObserver`, `shouldDraw` | Off-screen LED strips stop drawing. Edit's meters and band scope not checked |
| MO-11 | Met | As TR-11 | D36 |
| MO-12 | Met | `package.json` | No motion library |
| MO-13 | Missing | | No device test |
| MO-14 | Out of scope | | No haptics (BR-13) |
| MO-15 | Missing | | No profile recorded |

### Tokens

| ID | Status | Evidence | Note |
|---|---|---|---|
| TO-1 | Met | `design-system.css` `:root` | One file. Edit defines none; it only overrides `--mark-gap` inside `.tabs` |
| TO-2 | Partly | `design-system.css`, with the size group of D69 | Every group exists, and lint fails raw sizes and edges in composites (seen on 4 Nov). Four raw values that no rule reads remain in `composites.css`: `inset: -15px 0`, `scroll-margin-top: 88px`, `scroll-margin-block: 110px`, `outline-offset: -1px` |
| TO-3 | Met | `design-system.css` | D39: one flat list |
| TO-4 | Partly | `--text-1`, `--space-3`, `--layer-editor-toast`, `--track` | Mixed grammar. Not written |
| TO-5 | Met | `--rack-tile-dial`, `--palette-width`, `--pad-height`, `--clear-dock`, `--clear-notice` | Each is used by one component only. D66 removed Edit's use of `--thumb-off` |
| TO-6 | Partly | `prefers-color-scheme`, `prefers-contrast: more` (D40, D71) | Theme and contrast switch independently (audit probe). No density or platform axis |
| TO-7 | Out of scope | | No Tailwind |
| TO-8 | Out of scope | | D38 chose CSS, not DTCG |
| TO-9 | Partly | Comments on `--space-half`, `--layer-*`, `--duration-*`, `--opacity-quiet`, `--pointer-target`, `--dialog-*`, `--wide`, status roles | Colour, type and shadow tokens carry no purpose |
| TO-10 | Missing | | No pairing rule |
| TO-11 | Out of scope | | D34: curves, no springs |

### Tools

| ID | Status | Evidence | Note |
|---|---|---|---|
| TL-1 | Met | `package.json` `workspaces`; D50 | One repo. Edit takes its look through the two doors, checked by `the-app-only-through-its-look-doors` |
| TL-2 | Met | `?components`, `src/domain/screens/component-page`; story `LIFE-1955 the component page draws every component`; `lint:rules` `missing-from-component-page` | Every door export, in each state it has, drawn with no error at 375 and 1440 px (D68) |
| TL-3 | Met | `scripts/lint/rules.mjs` `raw-colour`, `raw-type`, `raw-spacing`, `raw-line`, `raw-size`, `raw-layer`, `raw-motion`, `raw-width`; Edit `edit-rules.mjs` | Each was seen to fail on 4 Nov. Edit's size rule is lighter (GE-10) |
| TL-4 | Out of scope | | No utility classes |
| TL-5 | Met | `rules.mjs` `raw-control`; Edit `edit-rules.mjs` `raw-control` (D76); `.dependency-cruiser.cjs` | A raw `<button>` failed in the domain (4 Nov morning) and in Edit's `Macros.tsx` (4 Nov). No raw control in Edit outside `ui/controls` |
| TL-6 | Met | `.dependency-cruiser.cjs`, `lint:layers`; `outside-the-layers`, `missing-door` | No violations, 142 modules |
| TL-7 | Met | Search of `var(--name)` | Every group exists (TO-2) and no token name is unresolved |
| TL-8 | Met | Four stories "axe finds nothing on Edit"; audit probe on Home, Lounge and Looks | Violations empty everywhere tried, with `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` |
| TL-9 | Partly | K-2; the two NA-17 stories | Keyboard paths for a sheet, a dial and a layer. No interaction test per component |
| TL-10 | Partly | D43 | By eye, on demand. No review recorded |
| TL-11 | Missing | | No contrast script over token pairs |
| TL-12 | Partly | The two doors; `?components` | An agent can list components from the doors and see them. No props catalogue |
| TL-13 | Met | `CLAUDE.md` | 55 lines, says what the code does not |

### Governance

| ID | Status | Evidence | Note |
|---|---|---|---|
| GO-1 | Met | `decisions.md` | D1 to D80 and the two CO choices each have "Chosen", "Why" and "Date" |
| GO-2 | Missing | | No changelog |
| GO-3 | Missing | | D54 removed tokens with no deprecation step |
| GO-4 | Missing | | No codemods |
| GO-5 | Partly | `rules.mjs` counts by rule | No adoption counts |
| GO-6 | Partly | `CLAUDE.md`: a new door export gets a specimen; a new look gets a composite | No rule for a new token |
| GO-7 | Partly | `CLAUDE.md`: no one-file exception; D76 | Edit's lighter size rule and its own `Key` are written in D76. Edit is outside the voice lint, and that is written only in a comment in `rules.mjs` |
| GO-8 | Missing | | No self-score |
| GO-9 | Partly | Deliberate violations on 4 Nov, then reverted | Seen to fail: `lint:code`, `lint:complexity`, `lint:types`, `lint:layers` (`composites-never-know-the-domain`, `no-circular`), `lint:dupes`, `lint:unused`; in `lint:rules` `raw-size`, `raw-line`, `raw-width`, `raw-spacing`, `raw-type`, `voice`, `look-in-domain`, `outside-the-layers`, `missing-from-component-page`, beside this morning's colour, layer, motion and control; Edit's `raw-control`, `hover-without-a-mouse`, `raw-edge`, `raw-size` and its tsc. Not seen: `missing-door`, and Edit's oxlint, Biome, depcruise and jscpd, since Edit's gate stops at its first failing step |
| GO-10 | Partly | `README.md` "The plan: one look" | An order for the move. No build order for the system |
| GO-11 | Met | `docs/design-system/README.md`, "Run the audit again" | The procedure, and the cadence: after each large change and before a new screen ships |
