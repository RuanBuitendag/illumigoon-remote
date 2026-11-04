# Transitions

What moves in the app and in Edit, how it moves, and which tokens it uses (TR-1). The tokens are in
`src/design-system/design-system.css`, under Motion (D36) and the appear and leave group (MO-2).

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
| A colour slot in a set | `.colour-slot` | grows to its share of the row | `--duration-settle`, `--ease-out` | no growth |
| A look in the list | `.look-item .led-strip` | the strip brightens or dims | `--duration-press`, `--ease-out` | the same: it is a filter |

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
