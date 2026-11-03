# User stories

What people do with Illumigoon, written as stories, each with one test on made-up lights. The stories come from the
LIFE-1934 walk through the app: the 67 findings on the Lounge (comment on LIFE-1885, 3 Nov 2026) and the editor
findings E1 to E17. Project standards sections 4 and 5 (Linear document "Agent rules: project standards") ask for them.

## How to read

- One file per persona. Each story has an id `P<persona>-S<number>`, the features it touches, its context, what it
  should take, the steps with the app's own labels, and what goes wrong around it: failures, wrong actions and
  changes of mind.
- `GAP n` marks a step the app gets wrong today. Its test is a **known fail**: it must still fail, and the run
  reports it if it starts to pass, so this table gets updated.
- Every test runs on fake lights in `scripts/regression/` (`fake-light.mjs`, served through
  `page.routeWebSocket`). The look library is a fresh temporary folder per test. Nothing reaches a real light, a real
  server or a real person.

## Running

| Command | Runs | Time |
| -- | -- | -- |
| `npm test` | types, unit tests, then every journey and story | about 4 min |
| `npm run test:unit` | vitest over `src/**/*.test.ts` | about 2 s |
| `npm run test:stories` | `scripts/regression/run.mjs --no-real` | about 4 min |
| `node scripts/regression/run.mjs --no-real --only P2-` | the stories whose name holds `P2-` | under 1 min |

A worker runs `--only` for the area it touched. The full `npm test` runs once per merge, never two at a time.

## Personas

| # | Name | One line | Goal | Skill | Device | What annoys them |
| -- | -- | -- | -- | -- | -- | -- |
| 1 | Noa | Turns the Lounge on in the evening and picks a look | a warm room in two taps | none | phone | waiting, a card that jumps, a look that needs a name |
| 2 | Tess | Makes her own looks in Edit | change a look and keep it | high | phone and laptop | lost work, engine words, undo that does not undo |
| 3 | Bram | Looks after the house: names, scenes, software, settings | set it up once and forget it | medium | phone | settings that do nothing, notices in the way |
| 4 | Lior | Has just bought a light and sets it up | a light on the home Wi-Fi with a name | none | phone | not knowing if it worked |
| 5 | (contexts) | The same features with one thing changed | the app holds up | any | phone and laptop | |

[01 Evening user on the phone](01-evening-user-on-the-phone.md) ·
[02 Look maker in the editor](02-look-maker-in-the-editor.md) ·
[03 Owner of the corners](03-owner-of-the-corners.md) ·
[04 New user setting up a light](04-new-user-setting-up-a-light.md) ·
[05 The same features in other contexts](05-the-same-features-in-other-contexts.md) ·
[Scrutiny](SCRUTINY.md)

### Not done yet

- The web research for personas (skill step 2) was not done. The personas come from the LIFE-1934 findings and
  from what the app does, so there are no source numbers yet, and there are 4 personas, not 15 to 20.
- Scene editing, the lock, schedules on new software and the off timer have no story yet: the fake light does not
  keep schedules or a lock.

## How failures are injected

| Failure | How the test makes it |
| -- | -- |
| A light stops answering | `light.powerOff()` closes its sockets and stops its heartbeat |
| A light comes back | `light.powerOn()` |
| A light restarts or is reset | the app's own RESTART and RESET, answered by the fake light |
| Old light software | the fake light sends no `light_sched_hash`, so schedules are not on it |
| New software on the server | `latestSoftware: '9.9.9'` on the story |
| A page reload in the middle | `page.reload()` |
| A light still on its own Wi-Fi | `hasWifi: false` on the fake light |

## GAP list

| GAP | Finding | What is wrong | Story |
| -- | -- | -- | -- |
| 1 | 10 | Fixed 4 Nov 2026: after one light is chosen, a tap on another light adds it, so two lights share a look | P1-S7 |
| 2 | E1 | Fixed 4 Nov 2026: the history starts at the look the light reported, so the first UNDO never goes to an empty look | P2-S11 |
| 3 | E12 | Fixed 4 Nov 2026: Escape closes the Check dialog that Clear all layers opens, as CANCEL does | P2-S6 |
| 4 | E13 | The fragments panel shows file names, "1 mod · 2 row" and "48 h ago" | P2-S7 |
| 5 | new | Fixed 4 Nov 2026: on the phone each CONTROLS row in Edit shows its name | P2-S8 |
| 7 | new | Fixed 4 Nov 2026: an app sheet takes the focus, keeps Tab inside, and gives the focus back on close | K-2 |
| 6 | new | Fixed 4 Nov 2026: Escape closes the Save scene sheet and every other app sheet, as CANCEL does | P3-S4 |

## Coverage

Status is the result of the last full run (4 Nov 2026): pass, or known fail with its GAP.

| Story | Features | Test | Status |
| -- | -- | -- | -- |
| P1-S1 open the Lounge while a light is still waking | Home, room card, room screen | `stories/evening-user.mjs` | pass |
| P1-S2 turn the Lounge off, try the level, turn it on | room power, level | `stories/evening-user.mjs` | pass |
| P1-S3 play Starfield, then undo it | Looks page, undo bar | `stories/evening-user.mjs` | pass |
| P1-S4 search for a warm look | Looks search | `stories/evening-user.mjs` | pass |
| P1-S5 change one light, then the whole room | light choice, Looks page | `stories/evening-user.mjs` | pass |
| P1-S6 a saved look keeps its name after a reload | look controls, SAVE AS NEW, Mine | `stories/evening-user.mjs` | pass |
| P1-S7 give the two front lights one look | light choice | `stories/evening-user.mjs` | pass |
| P2-S1 add a layer and take it to the room | Edit layers, leave warning | `stories/look-maker.mjs` | pass |
| P2-S2 undo and redo in Edit | Edit undo | `stories/look-maker.mjs` | pass |
| P2-S3 put the saved Candle back | RESET on the room | `stories/look-maker.mjs` | pass |
| P2-S4 remove a layer by mistake, get it back, redo | Edit layers, undo, Clear all layers | `stories/look-maker.mjs` | pass |
| P2-S5 save a changed look under a new name | Edit SAVE, Mine | `stories/look-maker.mjs` | pass |
| P2-S6 close a panel with Escape | Fragments, Check dialog | `stories/look-maker.mjs` | pass |
| P2-S7 read the fragments without file names | Fragments | `stories/look-maker.mjs` | known fail, GAP 4 |
| P2-S8 the controls list reads as the room does | Edit CONTROLS | `stories/look-maker.mjs` | pass |
| P2-S9 start a new look and save what it shows | NEW LOOK, Edit SAVE | `stories/look-maker.mjs` | pass |
| P2-S10 the laptop shows it all on one screen | Edit on the laptop | `stories/look-maker.mjs` | pass |
| P2-S12 a drag on a bar moves it from where it was, and a tap sets it | Edit bars | `stories/look-maker.mjs` | pass |
| P2-S11 a layer added while Edit loads, then undone | Edit undo | `stories/look-maker.mjs` | pass |
| P3-S1 rename the room and a light | Rename and arrange | `stories/corner-owner.mjs` | pass |
| P3-S2 schedules on old software say what to do | Schedules, Light software | `stories/corner-owner.mjs` | pass |
| P3-S3 save a scene and bring it back | scenes | `stories/corner-owner.mjs` | pass |
| P3-S4 Escape closes the scene sheet | scenes | `stories/corner-owner.mjs` | pass |
| P3-S5 the software notice leaves the rooms usable | software notice, Light software | `stories/corner-owner.mjs` | pass |
| P3-S6 a deleted look leaves the recent looks | Mine, MANAGE, recent looks | `stories/corner-owner.mjs` | pass |
| P3-S7 set the transition, try it, keep it | Transition | `stories/corner-owner.mjs` | pass |
| P4-S1 to P4-S13 | Add a light, own Wi-Fi, Light setup | `journeys.mjs` | pass |
| P5-S1 play a look while one light is off | silent light, Looks page | `stories/other-contexts.mjs` | pass |
| P5-S2 the Lounge on the laptop | room screen, Looks page | `stories/other-contexts.mjs` | pass |
| P5-S3 a long name with an emoji | Rename and arrange | `stories/other-contexts.mjs` | pass |
| LIFE-1953 every control is 44 px, nothing scrolls sideways, at 320, 375 and 1440 wide | every page and sheet but Edit | `stories/tap-targets.mjs` | pass |
| K-1 open the Lounge, play Starfield and go back with the keyboard alone | Tab and Enter routes | `stories/keyboard-routes.mjs` | pass |
| K-2 a sheet takes the focus, and Escape gives it back | sheet focus | `stories/keyboard-routes.mjs` | pass |
| K-3 an address opens its screen, also after a reload | screen addresses | `stories/keyboard-routes.mjs` | pass |

The other journeys in `journeys.mjs` (Home, room power, a light that dies, the Looks page, the level, Edit, the
software notice) stay as they are and back these stories up.

## Sources

- LIFE-1934, the walk through the app, and its comment on LIFE-1885 of 3 Nov 2026 with the 67 Lounge findings.
- The editor findings E1 to E17 in the same comment.
- No web sources yet (see Not done yet).
