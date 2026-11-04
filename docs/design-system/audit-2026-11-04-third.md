# Design system audit

App or system: Illumigoon, the one app (branch `life-1885-one-app`, HEAD `e35b063`), with Edit in `packages/patch-editor`
Date: 4 Nov 2026, third run
Checklist version: 2 Nov 2026, 277 rows, plus ST-15 added on 3 Nov 2026 (278 rows)
Earlier audit: `audit-2026-11-04-second.md` (at `79c7e61`, HEAD `7f0113e` audited)
Issues: LIFE-1948, LIFE-1949, LIFE-1954, LIFE-1955, LIFE-1956 (under LIFE-1936)

Status is one of: Met, Partly, Missing, Out of scope. Evidence is a file path, token name, lint rule, test or story.
Out of scope needs a reason.

## What changed since the second run

`56020e0` to `e35b063`, 23 commits, with D81 to D92:

- Edit: no `title` tooltips, ellipses or line clamps, held by its gate (D81); its words checked against
  `voice-rules.json`, the list the root lint reads too (D82); its menus, popovers and toast in `Presence` (D83);
  `Tabs` a tab list, a layer's name a key, a modulator tile bound by Space then Enter (D84); every size and offset a
  token, its own in one `:root` block of `styles.css`, and its gate runs every step (D85); undo from `UNDO_SECONDS`
  (D86, D92).
- The app: the iPhone's back swipe turned on in `AppViewController.swift` (D87); offsets under lint, with
  `--clear-sticky` (D88); a light's grip a key (D89); notes and a focus state on the component page (D90); a contrast
  check over every token pair in `lint:rules`, with the failing reds and quiet words changed (D91);
  `docs/design-system/transitions.md`.

Every row that was not Met in the second run was checked again, and so was every Met row these changes touch (the
colour roles, the tokens and their file, sizes, offsets, motion, the component page, the lint and its proof).

## Machine checks run on 4 Nov 2026, third run

| Check | Result |
|---|---|
| `npm run lint` (eight checks) | Passed. `lint:rules: no problems`; `edit rules: no problems`; depcruise 151 modules (app) and 170 (Edit), no violations; jscpd 0 clones in both; Biome prints one deprecation note on `biome.json`; knip prints four "redundant entry" hints, all from the uncommitted `knip.json` |
| `npx vitest run` | 4 files, 62 tests passed |
| `STORY_PORT=5271 node scripts/regression/run.mjs --only NA-17` | 6 passed: a dial steps; a layer moves by arrows; a layer is chosen with Enter; Edit's tabs change with the arrows and only the chosen tab takes Tab; a modulator binds by Space on the tile and Enter on the dial; a light moves down a room's list by arrows |
| `... --only K-` | K-1, K-2, K-3 passed |
| `... --only LIFE-1953` | 6 passed: the app at 320 x 640, 375 x 812, 1440 x 900; Edit at 375 x 812 and 1280 x 800; nothing in Edit scrolls sideways at 320 x 640 |
| `... --only axe` | axe finds nothing on Edit, phone and laptop, dark and light. 4 passed |
| `... --only LIFE-1955` | The component page draws every component with no error at 375 x 812 and 1440 x 900. 2 passed |
| Deliberate violations in the app, then reverted with `git checkout` | `lint:rules` failed `top: 7px`, `scroll-margin-top: 88px` and `outline-offset: -1px` in `composites.css` (`raw-offset`); a light-theme `--bad` of `#f0a090` (`contrast`, three pairs, 1.53 to 1.83:1); a component's notes renamed away (`missing-notes`). Hiding `src/composites/index.ts` made `lint:rules` exit 1, but by an uncaught `ENOENT`, not by its `missing-door` report |
| Deliberate violations in Edit, then reverted or deleted | One run of Edit's gate reported all of: a type error (tsc), an unused local (oxlint), and in its rules `height: 33px` (`raw-size`), `top: 3px` (`raw-offset`), `text-overflow: ellipsis` (`cut-off-text`), `title` on a `<div>` (`hover-text`), "palette", "preset" and "!" (`voice`). A second run reported oxlint complexity and depth, Biome cognitive complexity and a copied 665-line file (jscpd). A domain file importing `ui/touch.ts` failed `nothing-imports-the-ui` and `domain-stays-pure` |
| Searches | No `title` attribute or SVG `<title>` in Edit. `--space-half` only inside chips, rings, a scrollbar thumb and one wrapped control. No raw px in Edit's inline styles. Raw `vh` lengths pass both size rules: `max-height: 84vh` on `.dialog`, `calc(100vh - var(--space-4))` in Edit. Six `text-overflow: ellipsis` and one line clamp remain in `composites.css` |

Every story ran on made-up lights; nothing was sent to a real light. The axe probe on Home, Lounge and Looks from the
second run was not repeated; the app's axe evidence below is from that run, and the contrast lint now covers every
token pair. `npm run friction` was not run, since it rewrites `docs/friction/report.json`.

## Summary

| Section | Met | Partly | Missing | Out of scope |
|---|---|---|---|---|
| Brand and identity | 6 | 5 | 2 | 1 |
| Colour | 6 | 6 | 1 | 1 |
| Typography | 7 | 5 | 3 | 0 |
| Geometry | 8 | 2 | 1 | 2 |
| Spacing | 3 | 3 | 3 | 0 |
| Layout | 4 | 4 | 3 | 0 |
| Components | 4 | 5 | 1 | 0 |
| States | 3 | 9 | 3 | 0 |
| Accessibility | 5 | 7 | 4 | 0 |
| Forms | 1 | 18 | 5 | 1 |
| Core data display | 1 | 7 | 5 | 6 |
| Charts | 0 | 0 | 0 | 20 |
| Navigation | 5 | 7 | 2 | 3 |
| Flows | 1 | 11 | 1 | 6 |
| Transitions | 4 | 4 | 3 | 0 |
| Motion | 6 | 3 | 5 | 1 |
| Tokens | 3 | 4 | 1 | 3 |
| Tools | 9 | 3 | 0 | 1 |
| Governance | 3 | 4 | 4 | 0 |
| **All 278 rows** | **79** | **107** | **47** | **45** |

Second run: 69 Met, 113 Partly, 51 Missing, 45 Out of scope. This morning: 52, 125, 56, 45. On 3 Nov 2026: 33,
121, 79, 45. The counts come from the rows below, counted by script.

### Rows that changed status since `audit-2026-11-04-second.md`

| Row | Was | Now | Why |
|---|---|---|---|
| GE-10 | Partly | Met | Every height and width in Edit is a token (D85); a deliberate `height: 33px` failed Edit's gate |
| SP-1 | Partly | Met | Offsets are under lint in the app (D88) and in Edit (D85); raw `top`, `scroll-margin-top` and `outline-offset` failed |
| SP-2 | Partly | Met | `--space-half` only in the cases its comment lists; the row gaps in Edit are `--space-1` |
| LA-4 | Partly | Met | Edit's panels and matrix columns use width tokens (`--edit-side-panel`, `--edit-layer-panel`, `--edit-matrix-*`) |
| CM-8 | Missing | Met | No tooltip text left in Edit, and its gate fails a `title` (D81) |
| DA-1 | Partly | Met | Edit's row heights are tokens too (GE-10) |
| TR-1 | Missing | Partly | `transitions.md` maps each motion; tab switch, back and expand have no row |
| TR-3 | Partly | Met | Durations are tokens, and `transitions.md` gives each kind its tokens |
| TR-4 | Partly | Met | Edit's control menu, control editor and toast move on the enter and exit tokens (D83) |
| AC-14 | Missing | Partly | `UNDO_SECONDS` is the one undo time (D92); no rule for other timed content or for more time |
| TO-1 | Met | Partly | Edit now defines 40 size tokens in its own `:root` block in `styles.css` (D85), a second token file |
| TO-2 | Partly | Met | The four raw offsets in `composites.css` are gone and lint reads offsets (D88) |
| TL-11 | Missing | Met | `lint:rules` works out every word and mark token on each ground in four themes (D91); a light `--bad` failed |
| GO-7 | Partly | Met | Edit's exceptions are written in decisions: its own size tokens (D85), its `Key` (D76), "palette store" (D82) |

14 rows changed: 11 up to Met, 2 from Missing to Partly, 1 down from Met to Partly. Rows that kept their status but
have new evidence: BR-5, BR-6, CO-3, CO-7, CO-9, AC-2 (contrast lint), GE-12, CM-7, CM-10, ST-1, ST-13, ST-14, AC-5,
AC-8, FO-1, FO-8, DA-14, NA-6, NA-17, TR-6, MO-5, TL-3, TL-9, GO-1, GO-6, GO-9.

## The issues

| Issue | Rows it names | Met now | Every row Met? | Acceptance holds? | What is missing |
|---|---|---|---|---|---|
| LIFE-1948 editor geometry | SP-1, SP-2, GE-1, GE-7, GE-10, TL-3, TL-5 | All seven | Yes | Mostly. Edit's spacing, corners, layers, edges, controls and now sizes and offsets are tokens, checked by Edit's gate in `npm run lint`, and each was seen to fail on purpose. The sizes are Edit's own tokens in `styles.css` (D85), not app tokens in `design-system.css`, which the acceptance names | Edit's 40 size tokens sit outside the one token file (TO-1). `vh` lengths pass Edit's size rule (`calc(100vh - var(--space-4))`) |
| LIFE-1949 token groups | TO-2, GE-4, GE-7, MO-1, MO-2, LA-1 | All six | Yes | Yes. Each group exists in `src/design-system`, components use it, and the rows are Met | Nothing for these rows. TO-1, not named here, fell to Partly |
| LIFE-1954 addresses and keyboard | NA-7, NA-17, LA-7 | LA-7 | No | No. Each row has a test (K-3, six NA-17 stories, the LA-7 stories), but two rows are not Met | NA-7: cold-opening an `illumigoon://` link on the iPhone is untried. NA-17: warps (`SignalChain.tsx`), colour slots and Edit's sections and controls (`Surface.tsx`) reorder by drag only; the control menu has no key route checked |
| LIFE-1955 component page | TL-2, ST-1, CM-7 | TL-2 | No | No. One page shows every component with notes and a focus state, but not each state | ST-1: Edit's hover looks are not drawn, though D90 says there is no hover look; loading and error on six specimens; no dragged or read-only cells. CM-7: no variants, sizes, behaviour or content-rule fields |
| LIFE-1956 brand and voice | BR-1, BR-4, BR-5, BR-6 | BR-1, BR-4 | No | No. The rules are written, and both gates read one word list | BR-5: no sentence-length or casing check, and Edit's colour rows show hex codes. BR-6: Edit shows "Palettes" (`Randomise.tsx`), "Pick another device" and "node" (`Boundary.tsx`) and "reach a device over the mesh" (`bits.tsx`), which the gate misses because they sit in a record, a template or a function |

## Remaining gaps, by how much a person using the app would notice them

1. **Back and links on the iPhone** (needs the iPhone). The back swipe is turned on in `AppViewController.swift`
   and the `illumigoon://` scheme is registered, but neither the swipe nor a cold-opened link has been tried on the
   phone (NA-6, NA-7).
2. **Words in Edit.** "Palettes" on Randomise's part keys, "Pick another device", "node", "fw" and raw error text on
   Edit's error screen, "a device over the mesh" in the size note, and hex codes beside each colour (BR-5, BR-6,
   ST-14).
3. **Fields named only by placeholder.** The two save fields in Fragments and the name field in the palette store
   show no label, and Edit's `Field` names a field for a screen reader only (FO-1).
4. **Cut-off names in the app.** Six ellipses and a two-line clamp in `composites.css` (room look name, light note,
   recent looks, scene tag, Edit's title), with no checked way to read the rest on a phone (DA-14).
5. **Drag-only moves left in Edit.** Warps, colour slots, sections and controls reorder only by drag; the tab list
   has no tab panels, and the control menu has no menu keys (AC-5, CM-10, NA-17, AC-8).
6. **A look kept only by a toast.** An unsaved look from Edit is kept by SAVE on the undo toast, which leaves after
   `UNDO_SECONDS`; no lasting route was found (ST-13, AC-14).
7. **Device checks** (need the iPhone). Type, Dynamic Type, safe areas, VoiceOver, Increase Contrast, 16 px fields
   and frame rate (TY-8, TY-15, LA-3, AC-11, CO-7, FO-22, MO-13).
8. **Motion.** The control menu now rises in over `--duration-enter`, where MO-5 asks a context menu to open at
   once; `transitions.md` has no row for a tab switch, back or expand (MO-5, TR-1).
9. **The system's own records.** Edit's size tokens in a second file, and the README still says Edit writes its
   geometry by hand (TO-1); `vh` lengths pass both size rules (GE-12); no variants, sizes or behaviour on the
   component page (CM-7); `missing-door` crashes instead of reporting (GO-9); no rule for adding a token (GO-6).

## Rows

### Brand and identity

| ID | Status | Evidence | Note |
|---|---|---|---|
| BR-1 | Met | `docs/design-system/voice.md`, "Principles" | Five principles, each with a meaning, what follows from it and where it shows now: light is the picture, lit means live, flat, say a thing once, no small print |
| BR-2 | Partly | `decisions.md` D1; `docs/design-system/voice.md` | Product UI rules and brand words live in `docs/design-system`. No marks or marketing rules anywhere |
| BR-3 | Missing | `.wordmark` in `composites.css` | The wordmark is styled text. No mark files, clear space, minimum size or misuse list |
| BR-4 | Met | `voice.md`, "Voice" | Tone by moment (label, look, state, error, waiting, asking), with app examples and a do-not list. A search of UI strings in `src/domain/screens`, `src/composites` and Edit's `ui` finds no exclamation mark, "Oops" or "Successfully" |
| BR-5 | Partly | `docs/design-system/voice-rules.json`, read by `scripts/lint/rules.mjs` `voice` and by Edit's gate `voice` (D82); "palette", "preset" and "!" failed in Edit on 4 Nov | Both gates find banned words, US spelling, 12-hour times and exclamations, now in Edit too. Nothing checks sentence length or casing (the README lists both as read by a person). Edit's colour rows still show a hex code field (`input.hexin`, `ColourBodies.tsx`), which the style rules bar, and Edit's error screen shows "fw" and the raw error text (`Boundary.tsx`) |
| BR-6 | Partly | `voice.md` "Words"; `voice-rules.json` with Edit's one allowed phrase, "palette store" (D82); a search of Edit's strings | The gate reads text props and JSX text, so words in a record, a template or a function pass it. Edit shows "Palettes" and "Lock palettes" (`LABEL` in `Randomise.tsx`), "Pick another device" and "the ... node" for a light (`Boundary.tsx`), and "cannot reach a device over the mesh" (`budgetNote` in `bits.tsx`); voice.md says device is never a light |
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
| CO-3 | Met | `--good: var(--text-1)`, `--info: var(--text-3)`, `--warn: var(--text-2)`, `--bad` in `design-system.css`, both themes | Neutral roles, danger alone has a hue, no orange or amber. D91 darkened `--bad` in light and lightened it in dark; it stays a red. All four are used. No accent ramp, by the owner's rule |
| CO-4 | Partly | `--background`, `--text-*`, `--track`, `--wash`, `--fill`, `--focus`, `--on-fill`; `lint:rules` `raw-colour` | No raw ramp, so components use roles, and lint blocks raw colour in composites, domain and Edit's sheet. Names are numbered, not by intent. No accent role |
| CO-5 | Met | `--on-fill: var(--background)`; `.toast` in `composites.css`; `.power-key[data-checked] .power-key-thumb` | The one solid fill is ink (`--fill`), and paper on ink passes in both themes (axe found no toast or switch problem) |
| CO-6 | Met | `@media (prefers-color-scheme: light)` in `design-system.css` | Every role has a light value, directly or by reference; the new roles reference ramp roles. Edit reads the same tokens |
| CO-7 | Met | `@media (prefers-contrast: more)`, dark and light, in `design-system.css` (D71); `lint:rules` `contrast` over "dark with more contrast" and "light with more contrast" (D91); second-run probe | The quiet steps, `--track` and `--scrim` move up under more contrast, and every word and mark pair passes in both more-contrast themes by lint. Not tried with the iPhone's own Increase Contrast |
| CO-8 | Met | `@media (forced-colors: active)` in `design-system.css` and `composites.css`; `forced-color-adjust: none` on the switch, fader, marks, strips and swatches (D71); audit probe | With forced colours emulated, `--focus` and `--fill` are `Highlight`, quiet text is `GrayText`, and a focused key draws a solid 2 px ring. The switch, fader and strips keep their fills. Icons draw in `currentColor`. Not tried under Windows contrast themes themselves |
| CO-9 | Met | `lint:rules` `contrast` (D91): words 4.5:1 and marks 3:1 on `--background`, `--wash` and `--wash-strong`, in four themes; a light `--bad` of `#f0a090` failed on 4 Nov; four axe stories on Edit passed on 4 Nov | Every documented pair passes by script. Hairlines on `--track` are not checked, by D91, since they only divide |
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
| GE-10 | Met | `--row`, `--row-tall`, the size group; Edit's `:root` block in `styles.css` (`--edit-icon-key` to `--edit-matrix-ends`, D85); `raw-size` in `lint:rules` and in Edit's gate | No raw height or width in the app's layers or in Edit, in its sheet or inline (only `0` inline). A deliberate `height: 33px` failed Edit's gate on 4 Nov, which it passed in the second run. `vh` is not read as a length (GE-12) |
| GE-11 | Met | Rule in `design-system.css` and `styles.css`; LIFE-1953 stories | App: no control under 44 px at 320, 375 and 1440 px. Edit: none under 44 px at 375 x 812 and none under `--pointer-target` at 1280 x 800, in every section. All passed on 4 Nov |
| GE-12 | Partly | `--dialog-width`, `--dialog-wide` in `.dialog` | Dialogs and sheets use size tokens; full screen on the phone. `max-height: 84vh` on `.dialog` and `calc(100vh - var(--space-4))` in Edit are raw, and pass both size rules because they read only px, em and rem |
| GE-13 | Met | `voice.md` "Flat: hairlines (`--line`, `--track`) divide"; D57; `styles.css` header | The rule is written, and `.heading-row`, `.hr`, `.vr` follow it |

### Spacing

| ID | Status | Evidence | Note |
|---|---|---|---|
| SP-1 | Met | `--space-half`, `--space-1` to `--space-7`; `raw-spacing` and `raw-offset` in `lint:rules` (D69, D88) and in Edit's gate (D85); `--clear-sticky` | The four raw offsets in `composites.css` and Edit's raw `top` and `left` values are gone. On 4 Nov `top: 7px`, `scroll-margin-top: 88px` and `outline-offset: -1px` failed in `composites.css`, and `top: 3px` failed in Edit |
| SP-2 | Met | `--space-half` and its list of uses in `design-system.css` (D69, D85) | Every use: the padding of `.modchip`, `.reach`, `.trg` and the blend chip; the gap inside `.modchip .src` and `.kvalrow`; the rows of one wrapped `.seg`; ring offsets on `.fader` and `[data-surfacelit]`; the scrollbar thumb. Each is a listed case. No inline use in Edit |
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
| LA-4 | Met | `--half-column`, `--side-column`, `--dialog-width`, `--measure`, `--scene-card`; Edit's `--edit-side-panel`, `--edit-layer-panel`, `--edit-matrix-*` | Content widths are tokens in the app and Edit (`inspector.tsx`, `LayerStack.tsx`, `matrixSheet.tsx`), under both size rules |
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
| CM-7 | Partly | `?components`; `notes-design-system.ts`, `notes-composites.ts`, `notes-screens.ts` with `note(parts, keys, role, use, avoid)`; `lint:rules` `missing-notes` (D90), seen to fail on 4 Nov | Each component now has anatomy, keyboard, ARIA role, and one do and one don't, beside its states. No variants, sizes, behaviour or content-rule fields |
| CM-8 | Met | Edit's gate `hover-text` (D81), seen to fail on a `title` on 4 Nov; a search finds no `title` attribute or SVG `<title>` in Edit and no caller of the app `Fader`'s `title` prop | No content sits only in a tooltip, so nothing is out of a finger's reach. A dial's help is a `<desc>`, a reason shows in its row. The app `Fader` still accepts a `title` prop that nothing passes, and the app's lint does not check `title` |
| CM-9 | Met | `IconKey`, `Field`, `Choice` need a `label` (D76); `Press` `label`; `IconFrame` `aria-hidden`; axe stories | axe finds no `label` or name problem in Edit or the app on 4 Nov; the three hex fields are "Colour 1 code" and on |
| CM-10 | Partly | `drag-order.ts`, `LightDragList` with a key grip (D89); Edit `RowGrip` with `move` on layers (D80); modulator tiles bind by keys (D84) | Lights and layers move by arrows, and a tile binds without a drag; tiles do not reorder, by D84. `RowGrip` without `move`, so drag only: warps (`SignalChain.tsx` 510), colour slots (602), and Edit's sections and controls (`Surface.tsx` 272, 325) |

### States

| ID | Status | Evidence | Note |
|---|---|---|---|
| ST-1 | Partly | `?components`, with Edit's controls; a focus cell for each specimen through `data-focus-visible` (D90); LIFE-1955 stories | Default, pressed, held, quiet, disabled, empty, long text and now focus. D90 says there is no hover state, but Edit has hover looks inside `@media (hover: hover)` that the page does not draw. Loading and error on six specimens; no dragged or read-only cells |
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
| ST-13 | Partly | `Toast` (D46); `UNDO_SECONDS` in `src/design-system/timing.ts`, used by `store/undo.ts` and Edit's `useToast.ts` (D92) | One toast, one at a time, one undo time. SAVE for an unsaved look from Edit lives on the undo toast (`undo-bar.tsx`) and goes when it leaves; no lasting route to keep that look was found |
| ST-14 | Partly | `app-update.ts` `useUpdateError` sets `error.message`; Edit `attempt()` shows `e.message`; `Boundary.tsx` shows `error.message` and "fw" | Raw error text can reach the screen |
| ST-15 | Met | The list in `audit-2026-11-03.md`; D56, D58, D59, D66 | Since 3 Nov: one wording for a light's state, the shared plays-on note said once, the open room marked once, Edit's second live mark gone |

### Accessibility

| ID | Status | Evidence | Note |
|---|---|---|---|
| AC-1 | Partly | `scripts/friction/measure.mjs` tags | The checks aim at AA. No written target |
| AC-2 | Met | `lint:rules` `contrast` (D91); four axe stories on Edit, 4 Nov; second-run probe on Home, Lounge and Looks | Every token pair passes by script, in dark, light and both more-contrast themes |
| AC-3 | Met | LIFE-1953 stories (six) | App: no control under 44 px at 320, 375 and 1440 px. Edit: none under 44 px on the phone and none under 24 px on the laptop. Edit is in the stories now. axe `target-size` passes |
| AC-4 | Met | `:focus-visible` in both sheets; K-1, K-2 | Ring on every stop; Tab reaches each control |
| AC-5 | Partly | D80, D84, D89; stories "NA-17 a layer moves", "NA-17 a light moves", "NA-17 a modulator is bound" | Layers and lights reorder without a drag, and a modulator binds by keys. Warps, colour slots and Edit's sections and controls reorder by drag only (CM-10) |
| AC-6 | Partly | TY-5, TY-7; LA-7 stories | 200% text and 320 px pass, app and Edit. No text-spacing test (TY-13) |
| AC-7 | Partly | | No sign-in. Redundant entry and help order not checked |
| AC-8 | Partly | Base UI `Slider`, `Switch`, `Dialog`; K-2; Edit dials (`useKnobKeys.ts`); Edit `Tabs` as `tablist` (D84, `bits.tsx` 131) with the NA-17 tabs story | Dialog, dial and tab keys pass: arrows, Home, End, and only the chosen tab in the Tab order. The tabs have no `tabpanel` or `aria-controls`, and Edit's control menu (`SurfaceMenu`) has no `menu` role or arrow keys |
| AC-9 | Met | `prefers-reduced-motion`, `prefers-contrast`, `forced-colors` in `design-system.css` and `composites.css` | D36 and D71 built. Each changes the page (CO-7, CO-8, TR-11) |
| AC-10 | Partly | `.status-mark` solid, grey and dashed (D51) | Shapes back up colour. No greyscale check |
| AC-11 | Missing | | No VoiceOver pass |
| AC-12 | Missing | | No skip link or hidden-text utility |
| AC-13 | Met | `Toast` `role="status" aria-live="polite"` (`toast.tsx`), `BottomNotice` | Live regions for the toast and notice. No `aria-busy` |
| AC-14 | Partly | `UNDO_SECONDS` (D86, D92); `pauseUndo` while the keep dialog is open (`undo-bar.tsx`) | A rule sets the undo time. Edit's plain toast (`SHOW_MS` 2600 in `useToast.ts`) is outside it, and nothing lets a person have more time |
| AC-15 | Missing | | No manual pass recorded |
| AC-16 | Missing | `index.html` `lang="en"` | No locale or direction decision |

### Forms

| ID | Status | Evidence | Note |
|---|---|---|---|
| FO-1 | Partly | `.control-label` (D55); Edit `NamedField` with a visible `<label>` in the save form (`RailSaveForm.tsx`, D82); Edit `Field` with `aria-label` | The save form now shows its labels. Fragments' two save fields and the palette store's name field (`SaveField` in `Sheet.tsx`) show only a placeholder, and Edit's `Field` names a field for a screen reader only |
| FO-2 | Partly | `.note` under fields | Short in practice. No rule |
| FO-3 | Partly | | D21 chosen. No optional field carries the mark |
| FO-4 | Partly | `SheetBody` | One column in the app. Edit popover fields not checked |
| FO-5 | Missing | | No width rule |
| FO-6 | Partly | `ControlGroup` | D23 chosen. Not named per flow |
| FO-7 | Partly | `own-wifi-form.tsx` | D22 chosen. No error display |
| FO-8 | Partly | `voice-rules.json` over the app's and Edit's words (D82); `voice.md` do-not list | A script fails "please", "oops" and "successfully" in both. "sorry", "invalid" and "This field is required" are not on its list |
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
| DA-1 | Met | `--row`, `--row-tall`; Edit's row and part tokens (`--edit-section-head`, `--edit-tile-height`, `--edit-icon-key`) | Row heights come from tokens in both, under the size rules (GE-10) |
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
| DA-14 | Partly | Edit's gate `cut-off-text` (D81); `composites.css` | Edit wraps instead of cutting off. The app keeps `text-overflow: ellipsis` on `.edit-title`, `.scene-tag`, `.room-look-name`, `.light-note`, `.recent-look-name`, `.look-preset-name` and a two-line clamp, with no checked way to read the rest on touch |
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
| NA-6 | Partly | `screen-history.ts` (D72); `ios/App/App/AppViewController.swift` sets `allowsBackForwardNavigationGestures` (D87), named in `Main.storyboard` and `project.pbxproj`; K-3 | Back walks one screen at a time in the browser and on the laptop. The iPhone's edge swipe is now turned on in code but has not been tried on the device |
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
| NA-17 | Partly | K-1, K-2; six NA-17 stories, all passed 4 Nov | Home, room, Looks, a sheet, a dial, a layer, Edit's tabs, a modulator bind and a light's place by keyboard alone. Warps, colour slots and Edit's sections and controls reorder by drag only, and no story opens the control menu by keys |

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
| TR-1 | Partly | `docs/design-system/transitions.md` (D83) | Every motion in the app and Edit with its tokens and its reduced form: push, dialog and sheet, toast, popover, press, list reorder, switch. No row for a tab switch, back, an expand or a layout change |
| TR-2 | Missing | | No rule |
| TR-3 | Met | `--duration-*` and the enter and exit tokens; `raw-motion` lint; `transitions.md` "Tokens" | Each kind of motion has its duration token and its use written down |
| TR-4 | Met | `.dialog`, `.dialog-scrim`, `.toast`, Edit's `.surfacemenu` and `.surfacepop` on `--ease-enter`, `--duration-enter`, `--ease-exit`, `--duration-exit`; `Presence` in `EditorStage.tsx` (D83) | Every overlay comes and goes with token motion, and only fades under reduced motion |
| TR-5 | Partly | `--push` | Sheets do not follow the finger |
| TR-6 | Partly | `rise-in`, `sink-out` move by `--space-2` | No `scale(0)` anywhere, and nothing grows. `transitions.md` writes no entrance rule and no origin rule for popovers |
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
| MO-5 | Missing | `transitions.md` | No rule. Edit's control menu, a context menu, now rises in over `--duration-enter` (D83), where the row asks a context menu to open at once |
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
| TO-1 | Partly | `design-system.css` `:root`; Edit's `:root` block in `packages/patch-editor/src/styles.css` (D85) | Colour, type, spacing, corners, layers and motion trace to one file. Edit's 40 size tokens trace to a second. The README "Two sets of looks" still says Edit writes its geometry by hand |
| TO-2 | Met | `design-system.css`, with the size group (D69) and `--clear-sticky` (D88); `raw-offset` lint | Every group exists, and no raw value is left in composites; three raw offsets failed there on 4 Nov |
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
| TL-3 | Met | `scripts/lint/rules.mjs` `raw-colour`, `raw-type`, `raw-spacing`, `raw-offset`, `raw-line`, `raw-size`, `raw-layer`, `raw-motion`, `raw-width`, `contrast`; Edit `edit-rules.mjs` | Each was seen to fail on 4 Nov. Edit's size rule is now as strict as the app's (D85) |
| TL-4 | Out of scope | | No utility classes |
| TL-5 | Met | `rules.mjs` `raw-control`; Edit `edit-rules.mjs` `raw-control` (D76); `.dependency-cruiser.cjs` | A raw `<button>` failed in the domain (4 Nov morning) and in Edit's `Macros.tsx` (4 Nov). No raw control in Edit outside `ui/controls` |
| TL-6 | Met | `.dependency-cruiser.cjs`, `lint:layers`; `outside-the-layers`, `missing-door`; Edit `.dependency-cruiser.cjs` | No violations, 151 modules (app) and 170 (Edit). An upward import in Edit failed two rules on 4 Nov |
| TL-7 | Met | Search of `var(--name)` | Every group exists (TO-2) and no token name is unresolved |
| TL-8 | Met | Four stories "axe finds nothing on Edit"; audit probe on Home, Lounge and Looks | Violations empty everywhere tried, with `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` |
| TL-9 | Partly | K-2; the six NA-17 stories | Keyboard paths for a sheet, a dial, a layer, Edit's tabs, a modulator bind and a light's place. No interaction test per component |
| TL-10 | Partly | D43 | By eye, on demand. No review recorded |
| TL-11 | Met | `lint:rules` `contrast` (D91) | Works out each word and mark token on each ground in dark, light and both more-contrast themes, and names each failing pair with its ratio. A light `--bad` failed three pairs on 4 Nov |
| TL-12 | Partly | The two doors; `?components` | An agent can list components from the doors and see them. No props catalogue |
| TL-13 | Met | `CLAUDE.md` | 55 lines, says what the code does not |

### Governance

| ID | Status | Evidence | Note |
|---|---|---|---|
| GO-1 | Met | `decisions.md` | D1 to D92 and the two CO choices each have "Chosen", "Why" and "Date" |
| GO-2 | Missing | | No changelog |
| GO-3 | Missing | | D54 removed tokens with no deprecation step |
| GO-4 | Missing | | No codemods |
| GO-5 | Partly | `rules.mjs` counts by rule | No adoption counts |
| GO-6 | Partly | `README.md` "Put a new component on the component page", held by `missing-from-component-page` and `missing-notes`; `CLAUDE.md` | A rule for a new component. No rule for a new token |
| GO-7 | Met | `CLAUDE.md`: no one-file exception; D76, D82, D85, D91 | Each exception is in a decision: Edit's `Key` (D76), "palette store" (D82), Edit's own size tokens (D85), hairlines left out of the contrast check (D91). The old comment about Edit outside the voice lint is gone |
| GO-8 | Missing | | No self-score |
| GO-9 | Partly | Deliberate violations on 4 Nov, both runs | Seen to fail across the two runs: every root check, and now every step of Edit's gate (tsc, oxlint, Biome, depcruise, jscpd and its rules `raw-size`, `raw-offset`, `cut-off-text`, `hover-text`, `voice`), and `raw-offset`, `contrast` and `missing-notes` in `lint:rules`. `missing-door` was not: with a door gone, `lint:rules` stops on an uncaught `ENOENT` before its report |
| GO-10 | Partly | `README.md` "The plan: one look" | An order for the move. No build order for the system |
| GO-11 | Met | `docs/design-system/README.md`, "Run the audit again" | The procedure, and the cadence: after each large change and before a new screen ships |
