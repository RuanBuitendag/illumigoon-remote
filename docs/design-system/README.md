# Illumigoon design system

The design system is everything that decides how the app looks and behaves, in one place, so two people or two agents
make the same choice. It holds the decisions, the written rules, the tokens, the primitives, the tables and the checks
that prove they hold.

## Where it lives

| What | Where |
| -- | -- |
| Tokens | `src/design-system/design-system.css`, the `:root` block, with light values under `prefers-color-scheme: light` |
| Fonts | `src/design-system/index.ts` imports Geist and Geist Mono from `@fontsource` |
| Primitives | `src/design-system`, behind its door `index.ts`: keys, `Fader` with `FaderBand` and `FaderDot`, `Dialog`, `TextField`, `Icon` and `IconFrame`, marks, text with `Picked`, colour chips with `Swatch`, pad, LED strip |
| Composites | `src/composites`, with `composites.css`. Primitives put together, with no data, among them `Sheet` with `SheetBody` and `Toast` |
| The editor's look | `packages/patch-editor/src/styles.css`, and inline styles in `packages/patch-editor/src` |
| Component page | `?components` on the dev server: every component of the two doors in each state, from `src/domain/screens/component-page` (D68) |
| Decisions | `docs/design-system/decisions.md`, one dated choice for each of D1 to D68 |
| Audits | `docs/design-system/audit-YYYY-MM-DD.md`, one per run. Keep the old ones |
| Checks | `npm run lint`, and `scripts/lint/rules.mjs` for raw colours, type, spacing, sizes, box-shadow edges and controls, the style rules of `voice.md` that a machine can check, and a door's component missing from the component page |

The domain (`src/domain`) holds no look. `CLAUDE.md` has the layer rules.

## Two sets of looks, one set of tokens

There is one token set. The editor does not define tokens. Every colour and type token it uses comes from
`design-system.css` through `:root`, and `lint:rules` checks that its style sheet writes no raw colour and no raw type.

The two still look different, because the editor writes its own geometry by hand: spacing, corners, heights, layers
and timings, in `styles.css` and in inline styles. Its look is flat: no shadows for depth, faint washes for raised
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
