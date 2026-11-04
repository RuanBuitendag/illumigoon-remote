# UX lint

`npm run lint:ux` checks how the app feels, the way `npm run lint` checks the code (LIFE-1891). Run it before you
report a change to a screen or a flow, and fix what it finds.

It does two things:

1. Each rule must catch a small page that breaks it on purpose (`scripts/ux-lint/proofs.mjs`), and a clean page
   built like the room Ruan passed must give no finding.
2. Every story runs on made-up lights while the lint watches (`scripts/ux-lint/recorder.mjs`). After each press it
   reads the screen with the screen rules, and at the end it judges the whole story with the flow rules.

A finding that is not in `known.json` fails the run. `known.json` holds the findings that were there when the lint
started; the redesign works them down. When a change removes a known finding, run `npm run lint:ux -- --ux-update`
so the list gets shorter. Do not add a finding to the list to make a run pass: fix the screen.
An entry `rule | screen | *` covers one rule on one screen. Use it only for a finding whose words change from run to
run, such as the name of a look a story made; it was needed for a look shown twice on Looks and in the room
(LIFE-1965).

Every finding of the last run is in `%TEMP%\illumigoon-regression\ux-report.json`, with the stories that saw it.

## Rules

Each rule comes from a screen Ruan failed or passed. The report prints the fix for each one.

| Rule | Catches |
| -- | -- |
| `too-many-jobs` | more than 3 jobs on one screen (the old Home had 6) |
| `section-does-too-much` | more than 4 different actions in one section (the look in the room) |
| `too-many-controls` | more than 26 things to press in one view |
| `said-twice` | the same words twice on one screen, outside a column of one list |
| `empty-section` | a heading with nothing under it |
| `confirmation` | a question before an action |
| `stacked-sheets` | a sheet over a sheet |
| `no-way-back` | a screen past Home with no back key |
| `technical-word` | words from the code shown to a person |
| `orange-accent` | orange or amber outside the light itself |
| `tinted-panel` | a panel with a tinted background |
| `back-and-forth` | a story that goes A, B, A, B |
| `step-budget` | more presses than the story's `steps` |
| `slow-response` | a press that takes more than 200 ms to show its result |
| `layout-shift` | the page jumps (CLS over 0.1) |

These rules come from published guidelines, not from a screen Ruan judged (LIFE-1891, 4 Nov 2026):

| Rule | Catches | Source |
| -- | -- | -- |
| `small-target` | a thing to press under 44 x 44 px on the phone, 24 px on the laptop | Apple HIG 44 pt, Material 48 dp, WCAG 2.5.8 |
| `crowded-targets` | two things to press less than 8 px apart | Apple HIG, Material |
| `no-name` | a thing to press with no name for a screen reader | WCAG 4.1.2 |
| `hidden-state` | a switch, tab or chosen key that shows its state only by its look | Nielsen 6, Norman (feedback) |
| `many-primaries` | more than one filled main action in one view | von Restorff effect |
| `dead-end-error` | an error message with no key next to it | Nielsen 9 |
| `loose-groups` | as much space inside a group as between groups | Gestalt (proximity) |
| `moving-nav` | the back key in a different place on two screens of one story | Jakob's law, Nielsen 4 |
| `no-undo` | a delete, remove or reset that gives no UNDO | Shneiderman 6, Nielsen 3 |

Contrast and the focus ring are axe's work (LIFE-1937), and the text size floor is in the tokens (LIFE-1938).
Principles that need a person to judge them, such as Dieter Rams' ten, stay for reviews.

When Ruan fails or passes a screen and no rule agrees, change a rule or add one, with a proof, so the lint learns
what he wants. A rule that fires on a screen he passed is wrong: change the rule, not the screen.
