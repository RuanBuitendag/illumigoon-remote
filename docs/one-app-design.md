# One app design

LIFE-1885. The phone app and the patch editor become one app with one look, on the iPhone and on the laptop.
All choices here are made, so a worker can build from this document without asking.

Words used below. A **look** is what a light shows. A **patch** is the document behind a look, and that word leaves
the screens: a person sees "look" and "Edit". The **package** is `packages/patch-editor`. **Editor paths** start at
`packages/patch-editor/src`. **App paths** start at `src`.

## 1. Feature inventory

### App screens

| Feature | File (`src/domain/screens`) |
| -- | -- |
| Find lights, "no lights" message, search again | `search-screen.tsx` |
| Home: rooms with live strip, look name, sound mark, light marks, power and level | `home-screen.tsx`, `room-summary.tsx` |
| Whole house power and level, "no lights answering" note, app and light software notices, version on wordmark | `home-screen.tsx` |
| Scene shelf: apply, rename, delete, left-out note | `scene-row.tsx` |
| Save a scene for the whole house or one room | `save-scene-sheet.tsx` |
| Room: choose all lights or one, hero strip, look name, power, level | `room-screen.tsx` |
| Power one light from its row | `room-screen.tsx` |
| Look controls: slider, stepper, select, toggle, colour, palette | `look-control.tsx`, `look-controls.tsx` |
| Colours: edit, keep as a set | `look-controls.tsx` |
| Transition style and length, stored on the light | `look-controls.tsx` |
| Save the tuned look as a new look | `look-controls.tsx` |
| Looks: saved, grouped, simple; live strips; playing mark; "plays on X only" | `looks-page.tsx`, `look-library.tsx`, `look-strip.tsx` |
| Schedules: on, off, on between, off timer, days, scene; pause; remove | `schedules-page.tsx` |
| Lock: for how long, every night, unlock | `room-pages.tsx` |
| Take back a locked room | `room-pages.tsx` |
| Rename room and lights, order lights with arrows, move a light to a room, new room | `room-pages.tsx` |
| Light software: versions, update, update by itself | `light-software-page.tsx` |
| Add a light: scan, flash it, name it, choose room | `add-light-page.tsx` |
| Open the patch editor | `editor-page.tsx` |

### Editor features

| Feature | File (editor paths) |
| -- | -- |
| Top bar: Done, wordmark, trail, notice, tools | `ui/Shell.tsx`, `app/EditorStage.tsx` |
| House view: rooms and lights as tiles, Now and After strips, pick lights | `ui/House.tsx`, `domain/house.ts` |
| Send one patch to the picked lights, delivery note | `ui/House.tsx`, `device/house.ts` |
| Flash a light (four seconds of white, never saved) | `ui/House.tsx`, `domain/house.ts` |
| Switch to another light without going back | `ui/Shell.tsx` |
| Open a light by address | `ui/Shell.tsx` |
| Scenes rail: save the house, replace by name, apply, delete, strips per room | `ui/ScenesRail.tsx` |
| Arrival: how the next look arrives, per person; "make it their own" | `ui/arrival.tsx`, `ui/House.tsx` |
| Library rail: Gallery, Examples, Mine; live strips; load | `ui/PatchRail.tsx`, `ui/RailRows.tsx`, `ui/useRailListing.ts` |
| Save, notes, size, capture preset | `ui/RailSaveForm.tsx`, `ui/useRailActs.ts` |
| Presets under a patch: load, delete | `ui/RailRows.tsx` |
| Copy as JSON, paste JSON, export, import | `ui/RailRows.tsx`, `ui/useRailActs.ts` |
| Publish as preset, version or new patch; fetch published patches | `ui/useRailPublish.ts`, `ui/railPublish.ts`, `domain/publish.ts`, `ui/RailSaveForm.tsx` |
| Layers: add, clear, mute, solo, reorder, copy, paste, duplicate, remove, blend, opacity | `ui/LayerStack.tsx`, `domain/layerops.ts` |
| Master: whole mix, master colour, reshuffle | `ui/LayerStack.tsx`, `ui/ColourBodies.tsx`, `ui/SignalChain.tsx` |
| Signal chain and tabs (Source, FX), warp rack | `ui/SignalChain.tsx`, `ui/rack.ts` |
| Warp stages drawn as coordinate strips | `ui/Stages.tsx` |
| Inspector: FX, Colour, emitter and warp bodies, triggers | `ui/inspector.tsx`, `ui/NodeBodies.tsx`, `ui/ColourBodies.tsx` |
| Knobs and faders with modulation rings | `ui/Knob.tsx`, `ui/Fader.tsx`, `ui/Param.tsx` |
| Modulators: dock, slots, drag to bind, editor | `ui/dock.tsx`, `ui/modEditor.tsx`, `app/useBindGesture.ts` |
| Audio band scope | `ui/BandScope.tsx` |
| Macros | `ui/Macros.tsx` |
| Modulation matrix | `ui/matrixSheet.tsx` |
| Palettes: folder, in patches, save, recall | `ui/Palettes.tsx` |
| Fragments: save a layer, pull one in | `ui/Fragments.tsx`, `domain/fragments.ts` |
| Randomise: roll, keep parts, habits, history, Back | `ui/Randomise.tsx`, `app/useRolls.ts`, `domain/roll*.ts` |
| User surface: expose by right-click or held finger, edit, reorder | `ui/Surface.tsx`, `ui/controlEditor.tsx`, `app/useLongPress.ts` |
| Live strip from the real engine | `ui/Strip.tsx`, `engine/preview.ts` |
| Size budget | `ui/bits.tsx`, `app/EditorStage.tsx` |
| Light too old to edit: message instead of a white page | `ui/Boundary.tsx`, `app/EditorStage.tsx` |

### Duplicates, and which one wins

| Duplicate | App side | Editor side | Winner |
| -- | -- | -- | -- |
| Home of lights | Home, Room | House view | **App.** House goes. |
| Pick look | Looks page | Library rail | **App page**, with Mine, presets and Examples brought into it. |
| Finished looks | `domain/looks/patches` with `look-catalog.ts` groups | Gallery shelf | **App groups.** The Gallery shelf goes. |
| Saved looks | `savedLooks` in phone storage | Mine, files in the library | **Mine.** Saved looks move to files, as scenes and colour sets did in `e4c086d`. |
| Scenes, save and apply | `scene-row.tsx`, `save-scene-sheet.tsx` | `ui/ScenesRail.tsx` | **App.** The same files already. It takes REPLACE from the rail. |
| Send to many lights | Room scope only | Send bar | **App Looks page** with a new "which lights" sheet. |
| Transition | Stored on the light | Arrival per person | **Stored on the light.** One rule. Arrival and "make it their own" go. |
| Light power | Room, light row | Tool in the top bar | **App.** |
| Live strip | `look-strip.tsx`, recordings | `ui/Strip.tsx` | **Both stay.** Recordings for lists, the engine for editing. |
| Colours | `ColourEditor` for a look's controls | `ui/Palettes.tsx` for layers | **Both stay**, one file set. They already share the library. |
| Named controls | Room look controls | `ui/Surface.tsx` | **Both stay.** Room plays them, Edit defines them. |
| Sheets | `Overlay` composite | `ui/bits.tsx` Overlay, `ui/Sheet.tsx` | App look. The package part stays for now and takes the tokens. |
| Confirm and name dialogs | `Overlay` | `window.confirm`, `window.prompt` | **App `Overlay`**, through a new host seam. |
| Open a light | Fleet discovery | Trail, address box | **App.** Address box moves to Add a light. |

## 2. One information architecture

### The screens

There are eleven screens. There is no separate editor, no second home and no Done button.

| Screen | What it holds | Reached from |
| -- | -- | -- |
| Search | Only when no light is known | App start |
| Home | Whole house row, house scenes, rooms, Add a light | App start |
| Room | Which lights, hero, room scenes, lights, more rows | Tap a room |
| Looks | Saved, Mine, grouped looks, simple looks, Examples | CHANGE LOOK on a room, or the whole house row |
| Edit | The live strip and five sections | EDIT on a room, for the lights in scope |
| Schedules | As today, with the off timer row beside it on Room | Room |
| Lock, Take back | As today | Room, room card on Home |
| Rename and arrange | Names, move a light to a room | Room |
| Light software | As today, plus which light is master | Room, Home notice |
| Add a light | As today, plus an address box when nothing is found | Home |
| Recent | The last 10 states of the house, kept in memory until the app closes. Tap goes back, hold tries, KEEP saves a scene | RECENT beside the scenes on Home |

Sheets over a screen: Save scene, Save look, Which lights, Colours, Modulation matrix, Fragments, Palettes, Off timer.

### Moving on a phone

```
Home
 |- tap a room ------------> Room
 |                            |- CHANGE LOOK ------> Looks
 |                            |- EDIT -------------> Edit
 |                            |- Schedules, Lock, Rename and arrange, Light software
 |- whole house LOOKS -----> Looks, for every light
 |- + Add a light ---------> Add a light
```

`BackKey` at the top left leaves every page, and it is always named after where it goes: "Rooms", or the room name.
`ScreenStack` keeps its three levels, because Looks and Edit are both pages over Room. Nothing nests deeper.

Tap acts and hold shows. This is the one rule for gestures, and a person learns it once:

| Thing | Tap | Hold |
| -- | -- | -- |
| Look | Play it | Try it on the lights, until release |
| Scene | Apply it | Try it on the lights, until release |
| Light row | Power | Flash that light |
| Light row, in Rename and arrange | | Drag to order |

The Looks page says this in its one intro line: "Tap to play. Hold to try."

### Room, top to bottom

1. Which lights (`ScopeTabs`), only with two lights or more.
2. Hero: strip, look name, CHANGE LOOK, EDIT, power and level, look controls.
3. Recent looks: the last four in this room, as small strips.
4. Scenes of this room, then + Save scene.
5. Lights: name, status, mark.
6. Off timer, Schedules, Lock, Rename and arrange, Light software.

The "Patch editor" rows on Home and Room are gone. Editing is reached from the look itself.

### Edit on a phone

```
| < Bedroom                       SAVE |   BackKey, and the size meter only when above 80 percent
| Coals                                |   look name, on Left when one light is in scope
| ==================================== |   live strip, always on, stays while the rest scrolls
|                                      |
|   the open section, scrolling        |
|                                      |
| LAYERS  COLOUR  MOTION  CONTROLS ROLL|   OptionRow fixed at the bottom, for the thumb
```

A modulator and a dial sit in different sections on a phone, so a drag cannot join them. Hold the dial and choose
"Move with" a modulator. The laptop side tabs use the same words as these sections, ROLL and CONTROLS. Layers and
modulators count from 1 on screen, and the patch keeps its slot numbers from 0.

| Section | Shows | Editor side tab |
| -- | -- | -- |
| LAYERS | Master and layers, FRAGMENTS, signal chain with Source and FX, the opened FX row | `fx` |
| COLOUR | Palette of the selected layer or master, Palettes sheet | `colour` |
| MOTION | Macros, modulators, modulation matrix sheet | none |
| CONTROLS | What the Room screen shows for this look, held finger to expose | `user` |
| ROLL | Randomise | `randomise` |

Every edit goes to the light as it happens, as today. Back leaves. There is nothing to confirm. If the look changed and
was not saved, Room shows the notice "Changes are on the light" with SAVE and UNDO.

### Laptop width

The same screens and the same order, from 900 px up. No screen exists on one size only.

- Two panes. Home is a fixed 380 px column on the left. Room and its pages fill the right pane. The first room opens
  at start, so the pane is never empty. A room's `BackKey` hides, and a page's stays. This replaces the two column
  grid from `ef08825`.
- Edit takes the whole window, because it needs the width. The bottom tabs hide. The layers, the chain and the
  inspector stand as three columns, with macros and modulators under them, as today.
- The column's own tabs (FX, Colour, Randomise, User) show only here. The bottom tabs do that job on a phone.

## 3. What goes, and what moves

### The boundary

The package cannot import `src/design-system` or `src/composites`, because imports point from the app to the package.
So the look reaches the package through CSS variables, and app dialogs reach it through a host seam next to
`host.ts`. `src/domain` stays the only importer of the package.

### The new `PatchEditor` props

```ts
type PatchEditorProps = {
  light: OpenLight;                     // required: the house view is gone
  api?: HostFetch;
  identity: string;
  dialogs: HostDialogs;                 // ask(text) and askName(text, suggestion), drawn with Overlay
  section: EditorSection;               // 'layers' | 'colour' | 'motion' | 'controls' | 'roll'; below 900 px only
  isSaving: boolean;                    // shows the Save sheet
  withChrome: boolean;                  // false at the one call site; removed in slice 15
  onSaveClosed(): void;
  onLeave(look: AnimationState): void;  // the document on the light, sent by EditorPage to the rest of the scope
  onClose(): void;                      // the light cannot be edited or was lost
};
```

With `withChrome={false}`, `App.tsx` renders no `Shell`, `LightTrail`, `TopTools`, `LibraryRail` or `House`, and does not
call `useHouseFeed`. It renders only `EditorStage`, or `AwaitingCatalog`, and the overlays. `AwaitingCatalog` and
`Boundary` call `onClose` where they said "back to the house". `useArrivalChoice` is replaced by "the light's own".
The preview toggle goes and `Strip` always renders.

`EditorStage` marks each part with `data-section`. The package CSS shows only the open section below 900 px:

```css
@media (max-width: 899px) { .patch-editor [data-section]:not([data-open='true']) { display: none; } }
```

Parts stay mounted, so a section change loses no selection, and an open modulator stays open.

### What goes

| Goes | From the package | Replaced by |
| -- | -- | -- |
| Top bar, Done, wordmark, trail, light switcher | `ui/Shell.tsx`, `LightTrail`, `TopTools` in `app/EditorStage.tsx` | Edit header in the `EditLayout` composite |
| House view and send bar | `ui/House.tsx`, `ui/houseFeed.ts`, `device/house.ts`, the planning half of `domain/house.ts` | Home, Room, Looks |
| Scene rail | `ui/ScenesRail.tsx` | `scene-row.tsx` |
| Library rail browsing | `ui/PatchRail.tsx`, `ui/useRailListing.ts`, `ui/RailRows.tsx` | Looks page |
| Arrival | `ui/arrival.tsx` | `TransitionControls` in `look-controls.tsx` |
| Own tokens | Lines 12 to 72 of `styles.css` | `design-system.css` |
| Phone house feed | `/api/devices` answer in `phone/phone-host.ts`, `houseNow` in `editor-host.ts` | Nothing. Only the House view read it. |

`domain/house.ts` keeps the scene types and `FLASH`. knip will name whatever else falls unused.

### What moves into which layer

| Layer | Receives |
| -- | -- |
| `src/design-system` | `--wash`, `--wash-strong`, `--scrim`, `--float-shadow`, `--well`, `--modulation-*`, `--warn`, `--bad`, dark and light. `onHold` and `onHoldEnd` on `Press`. A pointer-based `useDragOrder` for dragging rows by touch and mouse. |
| `src/composites` | `EditLayout` (replaces `EditorLayout`): back, title, SAVE, strip space, bottom sections. `WhichLights`. `RecentLooks`. Hold props on `LookItem`, `SceneCard`, `LightRow`. `MoreRow` unchanged. `ScreenStack` gains `isPageWide` and the two pane CSS. |
| `src/domain/store` | New `look-preview.ts`, `undo.ts`. `library-store.ts` gains patches and presets. `fleet-store.ts` gains `flashLights`, `addLightByAddress`, `setHeldByEditor`. `household-store.ts` gains `roomOrder`, `recentLooks`, and orders lights by id. |
| `src/domain/screens` | `editor-page.tsx` holds the section, the save state and the "changes" notice. New `which-lights-sheet.tsx`, `off-timer-sheet.tsx`. |
| Stays in the package for now | Everything that keeps logic mixed with UI: `LayerStack`, `SignalChain`, `inspector`, bodies, `Knob`, `Fader`, `Param`, `dock`, `modEditor`, `Macros`, `matrixSheet`, `Palettes`, `Fragments`, `Randomise`, `Surface`, `controlEditor`, `Stages`, `Strip`, the hooks of `app/`, and `RailSaveForm`, which becomes the Save sheet body. |

### One look, inside the package

- Editor-only tokens move to `design-system.css`. The `.patch-editor` token blocks are deleted, so variables inherit
  from `:root` and a colour changes in one place.
- `@media (max-width: 820px)` becomes 899 px, in `styles.css` and `App.tsx`, to match the 900 px of `composites.css`.
- Below 900 px, type is at least 13 px and every press target at least 44 px. Mono labels at 9 to 11 px rise with
  them. The package has 345 inline `style` objects. Slice 11 changes only those that set a size on a phone screen.
- `lint:rules` gains one check: `styles.css` in the package holds no raw colour. It holds none outside the token block
  today, so this locks the state in, and weakens nothing.

### Two hazards the merge brings

- **Two sockets, one light.** While Edit is open the app's `LightConnection` and the editor's `Wire` are both on the
  light. A write by one looks like a change from elsewhere to the other, so `onHeartbeat` sends `light_state_req`
  after each settled edit. The reply for a long look is the allocation that can restart a light. Fix: `setHeldByEditor`
  makes that connection skip the request while Edit is open, and `onLeave` gives the store the document. Slice 12.
- **One light edited, a room shown.** The editor opens one socket. With "All lights" in scope, editing would leave the
  room mixed. On leaving, `EditorPage` sends the finished look to the other lights in scope with `applyLook`, spaced by
  the gaps in section 4. A person sees the others follow.

## 4. Feature ideas

### Brainstorm, with what exists

| # | Idea | Exists today | Pick |
| -- | -- | -- | -- |
| 1 | Hold a look to try it on the lights | No. `useLongPress` is for exposing a control | Yes |
| 2 | Hold a scene to try it | No. Same engine as 1 | Yes, with 1 |
| 3 | Scenes per room | Half. `captureScene` saves one room, the shelf only shows on Home | Yes |
| 4 | Drag lights into order | Half. Arrows in `ArrangePage`, stored by name, so a rename loses the place | Yes |
| 5 | Order rooms | No. `groupRooms` sorts by id | Yes |
| 6 | Hold a light row to flash it | Half. `FLASH` exists, only in House and for new lights | Yes |
| 7 | Undo the last change | No | Yes |
| 8 | Recent looks on a room | No | Yes |
| 9 | One look on any set of lights | Half. Send bar in House | Yes |
| 10 | Edits reach every light in scope | No | Yes |
| 11 | Off timer in two taps | Half. `timerEntry`, four taps in Schedules | Yes |
| 12 | Update a scene to now | Half. REPLACE in `ScenesRail` | Yes |
| 13 | Make mixed lights match | No | Later |
| 14 | Search looks by name | No | Later: groups are short |
| 15 | Haptic tick on hold | No. Free plugin, needs a native sync | Later |
| 16 | Swipe between rooms | No | No: fights the faders |
| 17 | Roll a surprise look from Looks | Roll exists in Edit | No: random looks were rejected in LIFE-1882 |
| 18 | Dim with the time of day | Schedules can hold it | Later |
| 19 | Keyboard keys on the laptop | No | Later |
| 20 | Group lights across rooms as a zone | No | No: 9 covers it |
| 21 | Pin looks to a favourites row | Saved looks do this | No |
| 22 | Show a room's next schedule on its card | Data exists | Later: more text on a card |
| 23 | Copy a look from a light to a light | Which lights covers it | No |

### The picks

| Pick | One sentence | Lives in | How a person finds it |
| -- | -- | -- | -- |
| Hold to try | Hold a look or a scene and the lights show it until the finger lifts. | `look-preview.ts`, Looks, scene shelves | "Tap to play. Hold to try." on Looks |
| Room scenes | A room shows its own scenes, and saving there saves that room. | `scene-row.tsx`, Room | Under the hero. Home keeps the house scenes |
| Drag lights | Hold a light in Rename and arrange and drag it into place. | `room-pages.tsx`, `useDragOrder` | Rows show a grip mark. The arrows go |
| Order rooms | Hold a room card on Home and drag it. | `home-screen.tsx`, `roomOrder` | A card lifts under the finger |
| Find a light | Hold a light's row and it breathes white for four seconds. | `room-screen.tsx`, `flashLights` | The row's own hold, and a line on Rename and arrange |
| Undo | After a look, a scene, or an edit, a notice offers UNDO for ten seconds. | `undo.ts`, `BottomNotice` | It appears by itself |
| Recent looks | The last four looks of a room sit under the hero, and they tap and hold like any look. | `RecentLooks`, `recentLooks` | Under the hero, once a look has changed |
| Which lights | Looks can target any set of lights in the house, shown as one line at the top. | `which-lights-sheet.tsx` | Tap that line. The whole house row has LOOKS |
| Edit follows scope | Leaving Edit with all lights in scope gives every light the look. | `editor-page.tsx` | It just happens |
| Off timer | One row on Room turns the room off in 15, 30, 60 or 120 minutes. | `off-timer-sheet.tsx`, `timerEntry` | Room, above Schedules. Hidden when no light can schedule |
| Update a scene | In scene EDIT mode, UPDATE keeps the name and takes what the lights show now. | `scene-row.tsx`, `renameScene` shape | EDIT on the shelf, beside Rename and Delete |

Scene placement rule: a scene whose lights are all in one room is that room's. Home shows the others, and all of them in
a house with one room. Schedules keeps offering every scene with lights in that room.

### Hold to try, safely

The danger: on firmware before 1.2.454 a long look replacing a long look can run a light out of memory and restart it.
Left proved the fix on 1.2.454 with 40 changes at 1.5 second gaps. Stable lights on 1.2.448 still have the fault. See
the comment in `onHeartbeat` in `src/domain/light-network/light-connection.ts`. A restart gives no socket close, so
writes in that time are lost.

Also from the firmware: a light saves its look one second after a change, and a look above 3800 bytes clears the stored
look. So a long hold writes to storage, and the restore writes it back. That is why a hold is two look changes at most,
and why a hold can never repeat itself.

`look-preview.ts` holds one pure function, `previewPlan(lights, look, now)`, and the code that carries it out.

| Rule | Value |
| -- | -- |
| Long look | `JSON.stringify(withPositions(animation)).length` at or above 3400 bytes. 3400 sits under the 3800 limit, on purpose: of the 35 looks, 4 pass 3800, and 6 pass 3400 |
| Older light | Version below 1.2.454, or not known |
| Lights it touches | Writable, online, able to play the look, in the current scope |
| Older light, long over long | Never sent. The on-screen strip shows the look and that light stays as it is |
| Gap between look changes on one light | 1.5 seconds on current lights, 4 seconds on older lights. A hold inside the gap waits, and joins if the finger is still down. The restore waits for the gap too |
| Arrival | 300 ms inline transition on current lights. Older lights use their own, with no extra work during the change |
| What is kept | Power, level and look of each light, read from the store before the first write. A light that was off goes back off |
| Store | `light.animation` does not change during a hold. A separate `usePreview` state drives the room's strip and the PLAYING mark |

The restore is one `light_set_state` per light, and it fires on any of these: finger up, pointer cancelled (a scroll),
screen change, app hidden, 15 seconds held. If a socket is closed at that moment the restore stays pending, and the
next `open` on that light sends it, so a restart mid hold still ends on the right look.

Gesture: `HOLD_MS` is 400. A move over 10 px cancels it, so lists still scroll. A press under 400 ms stays a normal tap,
and a tap is swallowed after a hold. A mouse held down does the same on the laptop. While a hold runs, the item lifts
and its strip brightens. Nothing else changes on screen. A hold is never a saved change, so it adds no undo step.

## 5. Build slices

### How to check each slice

Start `one-app-ui` (port 5177), `one-app-helper` (5174) and `patch-editor-mock` (8080) from the home `launch.json`. The
mock is in the firmware repo at `tools/patch-editor/server/mock-device.mjs`. For a two light room, run a second one from
that folder: `node mock-device.mjs --port 8081 --id a4cf12ff8e31 --name mock-right`. Add `--room study` for a second room.
Open `http://localhost:5177/?light=localhost:8080&light=localhost:8081` at 375 px width.

The mock prints `set_state`, `identify`, `edit` and `own arrival` lines, which prove a write. It prints nothing for
`light_state_req`, so read that one in the socket frames of the browser's network panel. It reports firmware 1.4.2, a
current light. For an older light, change that value for the check and put it back. It has no schedules, so
`canSchedule` is false on it, and it has no locks: use `?demo` for those, and for silent lights.

Every slice ends with `npm run lint` green and `npm run build` passing, one full run at merge. The Lint column is what a
worker runs while working. Use `KNIP_DISABLE_RAW_TRANSFER=1` when memory is low. The app must run after every slice.
In the table, `pe/` stands for `packages/patch-editor/src/`. A file name with no folder is in `src/domain/screens`,
`src/domain/store` or `src/domain/light-network`, as sections 1 and 3 say.

### Slices

All slices are built on branch `life-1885-one-app`. Slice 23 is complete except its pass with Ruan there: Left runs
firmware with no schedules, so the off timer has not run on a real light.

| # | Slice | Files | Check at 375 px | Lint |
| -- | -- | -- | -- | -- |
| 1 | One set of tokens, one breakpoint | `pe/styles.css`, `pe/App.tsx`, `src/design-system/design-system.css`, `scripts/lint/rules.mjs` | Edit opens on the mock in dark and light as before; no colour differs from Home | `lint:rules`, `lint:editor` |
| 2 | Mine and Examples in Looks | `pe/library/shared.ts`, `library-store.ts`, `look-library.ts` (store), `look-library.tsx` | Mine lists above the groups, Examples last; a tap plays and the mock prints `set_state` | `lint:types`, `lint:layers`, `lint:unused` |
| 3 | Saved looks become Mine | `library-store.ts`, `household-store.ts`, `look-controls.tsx` | A look saved before the slice is listed once after reload; SAVE AS A NEW LOOK lands in Mine | `lint:types`, `lint:unused` |
| 4 | Look actions: EDIT on Mine for delete, copy, export; add from a file; presets as rows; fetch published | `look-library.tsx`, `src/composites/look-list.tsx`, `library-store.ts`, `pe/library/shared.ts` | Delete a look, add it back from its exported file; rows stay 44 px high | `lint:rules`, `lint:dupes` |
| 5 | Which lights | new `which-lights-sheet.tsx`, `looks-page.tsx`, `home-screen.tsx`, `navigation-store.ts`, `src/composites/overlay.tsx` | Pick both mocks, tap a look, both print `set_state`; on `?demo` a silent light cannot be picked | `lint:rules`, `lint:layers` |
| 6 | The hold gesture, and Find a light | `src/design-system/keys.tsx`, `src/composites/room-layout.tsx`, `room-screen.tsx`, `fleet-store.ts` | Hold a light row and the mock prints `identify`, power unchanged; a tap toggles power; a scroll from a row does neither | `lint:code`, `lint:rules` |
| 7 | Add a light by address | `add-light-page.tsx`, `fleet-store.ts`, `household-store.ts`, `discovery.ts` | No `?light=` and helper stopped: type `localhost:8080` after the scan; the room appears and stays after reload | `lint:types`, `lint:rules` |
| 8 | Hold to try a look | new `look-preview.ts`, `fleet-store.ts`, `light-connection.ts`, `look-library.tsx`, `look-list.tsx`, `looks-page.tsx` | Hold: one `set_state`. Release: one more, hash back to the old one, power and level back. Scroll and hidden tab restore too. Mock at 1.2.448 on a Prism look, hold another Prism look: no line, and the page strip plays it | `lint:code`, `lint:complexity`, `lint:layers` |
| 9 | Hold to try a scene | `look-preview.ts`, `scene-row.tsx`, `src/composites/scene-shelf.tsx` | Hold a scene that turns a light off: it goes off, and returns on release | `lint:dupes`, `lint:rules` |
| 10 | Edit as a page: `withChrome={false}`, Back, EDIT on the hero, SAVE sheet, app dialogs, strip always on | `pe/index.tsx`, `pe/App.tsx`, `pe/host.ts`, `pe/app/EditorStage.tsx`, `pe/ui/RailSaveForm.tsx`, `pe/ui/Sheet.tsx`, `pe/ui/LayerStack.tsx`, `editor-page.tsx`, `room-screen.tsx`, `home-screen.tsx`, `src/composites/screen-stack.tsx`, `room-layout.tsx` | Room, EDIT, a knob prints `edit`, SAVE puts a look in Mine, Back lands on Room. No Done, wordmark, house or "Patch editor" row anywhere | `lint:editor`, `lint:rules`, `lint:unused` |
| 11 | Sections and touch sizes | `screen-stack.tsx` (`EditLayout`), `editor-page.tsx`, `pe/app/EditorStage.tsx`, `pe/app/useNavigation.ts`, `pe/styles.css`, inline sizes in panels touched | Five tabs at the bottom, each shows one section; Layer 2 then COLOUR shows its palette; 44 px targets; no sideways scroll; matrix, Fragments, Palettes fit and close | `lint:editor`, `lint:rules` |
| 12 | Quiet socket, and Edit follows scope | `light-connection.ts`, `fleet-store.ts`, `editor-page.tsx`, `pe/App.tsx` | Edit open, turn a knob: no `light_state_req` in the socket frames. Leave with both lights: the second mock prints `set_state`, Room is not mixed | `lint:editor`, `lint:code` |
| 13 | Touch order inside Edit | `pe/ui/LayerStack.tsx`, `pe/ui/Surface.tsx`, `pe/ui/SignalChain.tsx`, new `pe/ui/useRowDrag.ts` | With touch emulation, drag a layer and a control into a new place; the mock prints the change | `lint:editor` |
| 14 | Undo | new `undo.ts`, `scene-row.tsx`, `look-library.tsx`, `editor-page.tsx`, `home-screen.tsx`, `room-screen.tsx` | Apply a scene, UNDO, old look and level return. Leave Edit with changes: SAVE and UNDO both work. Notice leaves after ten seconds | `lint:code`, `lint:unused` |
| 15 | Cut the chrome: remove `withChrome` and everything under "What goes" | `pe/ui/`: `Shell`, `House`, `houseFeed`, `ScenesRail`, `PatchRail`, `RailRows`, `useRailListing`, `arrival`; `pe/device/house.ts`, `pe/domain/house.ts`, `pe/phone/phone-host.ts`, `pe/app/EditorStage.tsx`, `pe/App.tsx`, `editor-host.ts` | Every flow of slices 2 to 14 once more; the transition set on Room is used by the next look change | `lint:editor`, `lint:unused` |
| 16 | Room scenes | `scenes.ts`, `scene-row.tsx`, `room-screen.tsx`, `home-screen.tsx`, `save-scene-sheet.tsx` | + Save scene on a room preselects it; it shows there, not on Home; a whole house scene shows on Home; apply touches that room only | `lint:dupes`, `lint:rules` |
| 17 | Update a scene | `library-store.ts`, `scene-row.tsx`, `src/composites/scene-shelf.tsx` | Change a look, EDIT, UPDATE; applying later gives the new look, name kept | `lint:types`, `lint:rules` |
| 18 | Drag lights | new `src/design-system/drag-order.ts`, `src/composites/page-frame.tsx`, `room-pages.tsx`, `household-store.ts`, `rooms.ts` | Drag mock-right above mock-lounge; holds on Room and after reload; a rename keeps the place | `lint:rules`, `lint:layers` |
| 19 | Order rooms | `household-store.ts`, `rooms.ts`, `home-screen.tsx`, `room-summary.tsx`, `src/composites/room-card.tsx` | On `?demo`, hold and drag Office to the top; stays after reload; faders on cards still slide | `lint:rules` |
| 20 | Recent looks | `household-store.ts`, `fleet-store.ts`, `room-screen.tsx`, `look-strip.tsx`, new `src/composites/recent-looks.tsx` | Play three looks: newest first; tap plays, hold tries; a scene adds no entry | `lint:dupes`, `lint:rules` |
| 21 | Off timer | new `off-timer-sheet.tsx`, `room-screen.tsx`, `schedules.ts` | On `?demo` the row shows on Office and the sheet opens; hidden on the mock, which cannot schedule. The real light is proven in slice 23 | `lint:types`, `lint:rules` |
| 22 | Laptop panes | `src/composites/composites.css`, `src/composites/screen-stack.tsx`, `src/domain/screens/app.tsx`, `editor-page.tsx` | At 1280 px Home left, first room right; Edit fills the window with three columns, no bottom tabs. Nothing changed at 375 px | `lint:rules`, `lint:layers` |
| 23 | Every screen, both sizes; update `CLAUDE.md` and the screen list on LIFE-1885 | What the walk finds, `CLAUDE.md` | All eleven screens and eight sheets at 375 and 1280 px, dark and light. Then a pass on Left with Ruan there, including the off timer | all of `npm run lint` |

### What is left after these

The package still holds editor UI with logic mixed in. Those parts move into the layers one at a time, as `CLAUDE.md`
says, and a person sees no change from that work.
