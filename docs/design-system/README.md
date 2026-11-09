# Illumigoon design system

The design system is everything that decides how the app looks and behaves, in one place, so two people or two agents
make the same choice. It holds the decisions, the written rules, the tokens, the primitives, the tables and the checks
that prove they hold.

## Where it lives

| What | Where |
| -- | -- |
| Tokens | `src/design-system/design-system.css`, the `:root` block, with light values under `prefers-color-scheme: light`, and answers to `prefers-contrast: more`, `forced-colors: active` and `prefers-reduced-motion` (D70, D71) |
| Fonts | `src/design-system/index.ts` imports Geist and Geist Mono from `@fontsource` |
| Primitives | `src/design-system`, behind its door `index.ts`: keys, `Fader` with `FaderBand` and `FaderDot`, `Dialog`, `Presence`, `TextField`, `Icon` and `IconFrame` on one 14 canvas with one 1.2 line (D74), marks, text with `Picked`, colour chips with `Swatch`, pad, LED strip |
| Composites | `src/composites`, with `composites.css`. Primitives put together, with no data, among them `Sheet` with `SheetBody` and `Toast` |
| The editor's look | `packages/patch-editor/src/styles.css`, and inline styles in `packages/patch-editor/src` |
| Storybook | `npm run storybook`, port 6006: the tokens, every component of the two doors and of Edit in each state with its notes, and the real screens on made-up lights at phone and laptop size, from `stories/` (D95) |
| Component page | `?components` on the dev server: every component of the two doors and of Edit in each state, with its notes and a focus state, from `src/domain/screens/component-page` (D68). Storybook draws from the same specimens |
| Decisions | `docs/design-system/decisions.md`, one dated choice each, numbered from D1. A new one takes the next free number at the end |
| Audits | `docs/design-system/audit-YYYY-MM-DD.md`, one per run. Keep the old ones |
| Checks | `npm run lint`, and `scripts/lint/rules.mjs` for raw colours, type, spacing, sizes, offsets, box-shadow edges and controls, the contrast of every token pair, the style rules of `voice.md` that a machine can check, and a component with no specimen or no notes on the component page |

The domain (`src/domain`) holds no look. `CLAUDE.md` has the layer rules.

## What the voice check covers

The rules are in `voice-rules.json`. `lint:rules` reads them for the app, and Edit's gate reads them for Edit (D82).

It checks:

- the words the app shows in `src`: text in JSX, text props such as `label`, `title` and `aria-label`, and every
  string with a space in it, and a one-word label such as `'Colours'`;
- words the app does not use, such as palette, preset, firmware and node;
- words `voice.md` asks not to write: successfully, please, oops;
- British spelling: colour, centre, grey, favourite;
- the 24-hour clock, in text and in date formats;
- no exclamation marks;
- no sentence over 25 words;
- no title case: three capitalised words in a row.

It does not check, so a person reads for these:

- full stops at the end of a sentence;
- capitals on keys;
- how numbers and units are written, such as `60 %`;
- tone: plain, calm, and saying what happens;
- a one-word string in small letters, such as a key in a store or a file name;
- hex codes and other values that are not words. Edit shows none since D94.

## Put a new component on the component page

`lint:rules` fails until each step is done.

1. Export the component from its layer's door, `index.ts`.
2. Give it a specimen in one of the specimen files in `src/domain/screens/component-page`, with made-up props, in
   each state the app shows. Name a loading state `loading, ...` and an error state `error, ...` when it has them.
3. Add its notes to a notes file in the same folder: `Name: note(parts, keys, role, use, avoid)`. Write each in one
   short line, in the voice of `voice.md`.
4. The page draws the first state again with the focus ring. Set `focus` to another state's name, or to `null` for
   a screen, a sheet or dialog that takes the focus itself, or a part with no control.
5. Add its story to the file of its group in `stories/`: `export const Name = specimenStory('Name', DOOR);`.
6. Run `STORY_PORT=5291 node scripts/regression/run.mjs --only LIFE-1955`.

A control of Edit's goes into `packages/patch-editor/src/ui/specimens.tsx`, and its notes still go in the app's
notes files.

## Add a token (GO-6)

A new token is the last choice. Use an existing token when one means the same thing, even if its value is a little
off.

1. Name the token for what it is used for, in full words: `--row-tall`, `--dialog-max-height`. A size that only
   Edit has starts with `--edit-` and names the part: `--edit-tile-width`.
2. Put it in the first `:root` of `src/design-system/design-system.css`, beside the tokens of its kind. Another file may
   only give an existing token a local name. A colour also needs its light, dark and more-contrast values.
3. Use it in the style sheet in place of the raw value. `npm run lint` fails any raw length, colour or type.
4. A colour token that holds words or a mark is in the contrast check of `lint:rules`. Run `npm run lint` and fix a
   pair that fails.
5. If the token comes from a choice between options, add a dated decision to `decisions.md`.

## Two sets of looks, one set of tokens

There is one token set. Every colour, type, spacing and size token the editor uses comes from `design-system.css`
through `:root`. The sizes of the editor's own parts, named `--edit-*` for the part, sit there too, and the editor's
gate fails on any raw length or any length token defined in its own `styles.css` (D85, D93). `lint:rules` checks
that its style sheet writes no raw colour and no raw type.

The editor's look is flat: no shadows for depth, faint washes for raised
things, hairlines to divide, small corners, small capital labels, and an underline for the chosen item.

The audit says, row by row, where the app and the editor differ.

## The plan: one look (LIFE-1935)

On 3 Nov 2026 Ruan said he prefers the editor's look to the rest of the app and wants the app moved onto it. The
palette store and fragments panels are left out, because they are messy.

So the editor's look becomes the one look:

1. Turn the editor's hand-written values into tokens in `design-system.css`: corners, spacing steps, row heights,
   layers, durations, opacities and line widths.
2. Move the editor's recipes (washes, hairlines, labels, the chosen-item underline, tabs) into primitives in
   `src/design-system`.
3. Move the app's screens onto those primitives, so one job has one component. The fader, sheet, toast, swatch,
   selected mark and icons are done, and the editor uses them too (LIFE-1950, D44 to D50).
4. Turn on the lint for the editor's spacing and controls once the tokens exist.

`decisions.md` already takes the editor's side wherever the two differ.

## Run the audit again

The steps come from the skill `design-system-checklist` in `C:\Users\ruanb\.claude\skills\design-system-checklist`.

1. Copy `audit-template.md` from the skill to `docs/design-system/audit-YYYY-MM-DD.md`, with the day's date.
2. Run the machine checks first, and note the date of each run:
   - `npm run lint` (includes `lint:rules` and `lint:layers`).
   - `npm run friction`, which runs axe and measures tap targets at phone width into `docs/friction/report.json`.
   - A search for any `var(--name)` in the two style sheets that `design-system.css` does not define.
3. Give each row a status from `checklist.md`: Met with evidence, Partly with what is missing, Missing, or Out of
   scope with a reason. Say where the app and the editor differ.
4. A row that needs a device stays Partly until someone tests it on the iPhone or in the laptop app.
5. Count the statuses per section with a script, fill in the summary, and list the rows that changed since the last
   audit.
6. Put the gaps into Linear, one issue per area, with the row IDs.

Run it after each large change to the design system, and before a new screen ships.

## Rules added for this app

- **ST-15. No duplicated information.** One fact shows in one place on a screen. If a dot, a strip, a switch or a label
  already shows a state, no note, badge or second label says it again. From "Agent rules: project standards",
  section 2, 3 Nov 2026.
