# Transitions

What moves in the app and in Edit, how it moves, and which tokens it uses (TR-1). The tokens are in
`src/design-system/design-system.css`, under Motion (D36) and the appear and leave group (MO-2).

Motion has two kinds (D107). Productive motion is quick and plain, for what happens often: a press, a push, a
sheet. Expressive motion is slower and brighter, for the few big moments: a look that starts on a room, a light that
takes a change. A state change runs as a transition, so a new change on its way starts from where the part is and
can be caught part-way; only what appears or leaves runs as a keyframe animation.

Under reduced motion (D36) nothing slides, grows or springs. Colour and opacity still change, and what
appears or leaves only fades. The LED strips are content and keep drawing.

## Tokens

| Token | Value | For |
| -- | -- | -- |
| `--duration-press` | 140ms | a key under a finger, a row settling after a sort |
| `--duration-settle` | 240ms | a control that changes state: a switch, a colour slot |
| `--duration-push` | 550ms | a screen pushed over another |
| `--duration-glow` | 900ms | the slow change of a fader's light colour |
| `--duration-enter` | 200ms | something appearing: a dialog, a sheet, a toast, a popover |
| `--duration-exit` | 140ms | the same thing leaving, quicker, so the screen under it is back at once |
| `--ease-out` | ease-out | press and settle |
| `--push` | cubic-bezier(0.32, 0.72, 0, 1) | a screen push, and a switch's thumb |
| `--ease-enter` | cubic-bezier(0, 0, 0.2, 1) | appearing: slows into place |
| `--ease-exit` | cubic-bezier(0.4, 0, 1, 1) | leaving: speeds away |
| `--duration-draw` | 520ms | a line that draws itself: the power symbol turning on |
| `--ease-draw` | cubic-bezier(0.6, 0, 0.2, 1) | the same draw, and the run of an activity line |
| `--duration-travel` | 4s | one trip of the light round a ranked key |
| `--duration-activity` | 1.4s | one run of an activity line, one sweep over a strip that waits |
| `--duration-spring` | 480ms | a part that springs back after a press, or springs to its new size |
| `--ease-spring` | a spring curve with a small overshoot | the same |
| `--duration-expressive` | 900ms | a big moment: a look that starts, a change the light took |
| `--stagger-step` | 40ms | the step between the parts of a screen that come in one after another |

## The app

| What | Where | Motion | Tokens | Reduced motion |
| -- | -- | -- | -- | -- |
| A room or a page opens over Home | `.screen`, `composites.css` | slides in from the right; Home moves back and dims | `--duration-push`, `--push`, `--opacity-behind` | fades in place; on the laptop the room does not move and only a page fades |
| Back, by the back key, the device's Back or the iPhone's edge swipe | `.screen`, `composites.css` | the same push run backwards: the screen slides out to the right, and the one under it comes forward and brightens | `--duration-push`, `--push`, `--opacity-behind` | fades out in place |
| A dialog and a sheet | `.dialog`, `.dialog-scrim`, `design-system.css` | rises a step and fades in; sinks and fades out; the scrim fades | `--duration-enter`, `--ease-enter`, `--duration-exit`, `--ease-exit` | fades |
| A toast | `.toast` in a `Presence`, `composites.css` | rises in; sinks out after it goes | the enter and exit tokens | fades |
| A key under a finger | `button[data-held]`, `design-system.css` | lifts a step and grows a little | `--duration-press`, `--ease-out` | stays still |
| A row in a sorted list | `[data-sorting] > *`, `drag-order.ts` | the others slide to make room; the dropped row settles | `--duration-press`, `--ease-out` | no slide |
| A switch | `.power-key`, `.power-key-thumb` | the thumb slides across and the fill changes colour | `--duration-settle`, `--push` | the colour changes, the thumb jumps |
| A fader's fill | `.fader-fill` | the light colour glows over | `--duration-glow` | the same: it is colour |
| A look in the list | `.look-item .led-strip` | the strip brightens or dims | `--duration-press`, `--ease-out` | the same: it is a filter |
| The parts of a room or a page that opens | `.room-scroll > *`, `.screen-page > *`, `composites.css` | each rises in a step after the one above it; the eighth and later come together | `--duration-enter`, `--ease-enter`, `--stagger-step` | all fade in together |
| A key that can be held, while a finger is down | `button[data-holdable]::after`, `design-system.css` | the dot at its edge grows along it and reaches the far side as the hold starts (D114) | `--duration-hold`, `--hold-mark` | the dot stays a dot and fills the edge when the hold starts |
| A key let go after a hold, the power key after a press | `button[data-held]`, `.power-key` | springs back with a small overshoot | `--duration-spring`, `--ease-spring` | stays still |
| A colour slot in a set | `.colour-slot` | springs to its share of the row | `--duration-spring`, `--ease-spring` | no growth |
| A new look starts on a room (expressive) | `.led-strip-room[data-feedback='took']`, `led-strip.tsx` | the room's strip glows once | `--duration-expressive` | the same: it is a filter |
| A light took a change (expressive) | `[data-feedback='took']` | the part that changed glows once | `--duration-expressive` | the same: it is a filter |
| A light refused a change | `.led-strip[data-feedback='refused']`, `led-strip.tsx` | the strip goes back to what the light shows and shakes a step each way, twice (D110) | `--duration-settle` | the strip dims once |
| Work under way | `.activity`, `design-system.css` | a piece of light runs along a hairline | `--duration-activity`, `--ease-draw` | the line pulses |
| A strip that waits for its recording | `.led-strip[data-loading]` | a soft light sweeps over the slot | `--duration-activity` | stays still |
| A ranked key | `.text-key[data-rank]::before` | a piece of light travels round it (D100) | `--duration-travel` | stays still |
| The MORE menu | `.key-menu` | rises in; sinks out | the enter and exit tokens | fades |

No part moves from one screen into the next (no shared element, D108). The push is the link between a room card and
its room.

## Edit

| What | Where | Motion | Tokens | Reduced motion |
| -- | -- | -- | -- | -- |
| A tab switch in Edit | `Tabs` in `bits.tsx`, `.tabs` in Edit's `styles.css` | none: the panel changes and the line moves under the chosen tab at once | none | the same |
| A rack shuts or opens | `RackToggle` in `bits.tsx` | the arrow turns; the rack's rows go or show at once | `--duration-press`, `--ease-out` | the arrow jumps |
| The control menu | `.surfacemenu` in a `Presence`, `Surface.tsx` | none: a context menu opens and closes at once (MO-5) | none | the same |
| The control editor | `.surfacepop` in a `Presence`, `EditorStage.tsx` and Edit's `styles.css` | rises in; sinks out after it closes | the enter and exit tokens, the app's `rise-in` and `sink-out` | fades |
| Edit's toast | the app's `Toast` in a `Presence` | as the app's toast | the enter and exit tokens | fades |
| Edit's sheets (save, matrix, fragments) | the app's `Sheet` | as the app's dialog | the enter and exit tokens | fades |
| A key under a finger | the app's `button[data-held]` | as the app | `--duration-press`, `--ease-out` | stays still |
| A modulator's level bar and a dial's travelling dot | `LiveMeter`, `Knob` | written every frame by the shared animation loop, with no transition | none: the light's own value | the same: it is content |
| A dragged layer, warp or modulator | `useRowDrag.ts`, the drag ghost | follows the pointer, with no transition | none | the same |
