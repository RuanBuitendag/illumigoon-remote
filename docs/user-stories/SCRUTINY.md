# Scrutiny

Each feature the stories touch, judged for completeness (C), robustness (R) and ease of use (U). Findings are
numbered once across the file. `GAP` means a story test shows it; `(confirm)` means it comes from reading the code
or one run and needs a look in the running app.

Taps are counted from Home, with the app open, on the phone. A frequent task over 3 taps is a U finding.

## Home and the room card

Reach: open a room 1 tap; play a look 2 taps (`Lounge look: Candle`, then a look).

- **OK** The card holds its place while a light wakes (P1-S1).
- **OK** A light that stops answering gets a mark beside its name, and loses it when it returns (P5-S1).
- **U-001** The silent mark (`StatusMark`, `src/design-system/marks.tsx`) is an empty `<i>` with no role or text,
  so a screen reader says nothing about a light that does not answer. Give it an accessible name.
- **U-002** The look button's accessible name is "Lounge look: Candle" while its visible text ends in LOOKS. Speech
  input users who say "LOOKS" do not reach it (WCAG 2.5.3, label in name).

## Room screen and the light choice

Reach: power 1 tap from Home; one light's look 3 taps.

- **C-001 GAP 1** Two lights cannot be chosen together: a tap on a second light chooses only that light
  (finding 10, P1-S7).
- **OK** The level cannot move while the room is off (P1-S2); CHOOSE ALL brings the whole room back (P1-S5).

## Looks page

Reach: 2 taps to play.

- **OK** PLAYING shows once; UNDO on the bar brings the last look back (P1-S3); search reads descriptions (P1-S4).
- **R-001** The page has two buttons named UNDO at once (room colours and the undo bar). A test or a screen reader
  user has to tell them apart by place. Name the bar's key "Undo Starfield" or similar.
- **U-003** Most used is drawn once when the page opens, so a look played now shows there only next time. That keeps
  rows still under the finger, but nothing says so (confirm whether people notice).

## Look controls and SAVE AS NEW

- **OK** A kept look keeps its name and position after a reload (P1-S6).

## Edit

Reach: 2 taps from Home (`Open Lounge`, `EDIT`).

- **R-002 GAP 2** An edit made while Edit is still loading sometimes makes the first UNDO go back to an empty look,
  0 / 8, and send it to the light (E1, P2-S11). `useHistory` starts `rested` on the patch it first sees, which can be
  the empty one before the light's look arrives. It is a race: once the look has loaded, undo and redo work (P2-S2,
  P2-S4). A person on a slow light who undoes one step can lose the whole look on the light.
- **U-004 GAP 3** Escape does not close the Check dialog that Clear all layers opens (E12, P2-S6). The Fragments
  panel does close on Escape, so the two differ.
- **U-005 GAP 4** The Fragments panel shows file names, "1 mod · 2 row" and "48 h ago" (E13, P2-S7).
- **U-006 GAP 5** On the phone each CONTROLS row shows only its glyph: `.ctllabel` is 0 px wide, so Speed, Breath,
  Colours and Second colours are not readable (`packages/patch-editor/src/ui/Surface.tsx`, P2-S8).
- **U-007** The save sheet stays open after SAVE and its key turns to REPLACE. The look is saved, but the sheet
  looks as if it is still asking (P2-S5, confirm).
- **U-008** On the laptop the panel tabs are lower-case text styled as capitals (`fx`, `colour`, `controls`), while
  the phone tabs are real capitals. Screen readers spell the two differently (P2-S10).
- **OK** The leave warning (E9), "Candle, changed" with RESET (finding 45, E15), the "On Back Left, then all 4 Lounge
  lights when you leave" line (finding 42) and the Clear all layers check (E17) all work (P2-S1, P2-S3, P2-S4).

## Scenes

Reach: save 2 taps and a name; apply 1 tap.

- **OK** SAVE waits for a name; a scene brings the room back (P3-S3).
- **U-009 GAP 6** Escape does not close the Save scene sheet; only CANCEL does (P3-S4).

## Room settings

Reach: 2 taps (`Open Lounge`, `Room settings`), then 1 per row.

- **OK** Rename and arrange keeps the room and light names over a reload (P3-S1); a blank name is ignored and a
  long name is cut at 15 characters with its emoji (P5-S3).
- **C-002** The room name lives only in this phone (`renameRoom` in `src/domain/store/household-store.ts`); light
  names go to the light. A second phone still sees the old room name (finding 65, confirm with two phones).
- **U-010** After a rename the row moves to its new place in name order, under the finger, while the field still
  has focus (P5-S3).
- **OK** Schedules on old light software say what to do and lead to Light software (P3-S2).
- **OK** Transition style and length reach every light and stay over a reload (P3-S7).
- **OK** The software notice leaves the rooms usable (finding 5, P3-S5).

## Recent looks and Mine

- **OK** A deleted look leaves the room's recent looks (E10, P3-S6). DELETE asks for a second tap.

## Light setup and adding a light

- **OK** Every setup journey in persona 4 passes on fake lights.

## Summary

| Kind | Count |
| -- | -- |
| C | 2 |
| R | 2 |
| U | 10 |

The worst, in order:

1. R-002 an early edit in Edit can make the first UNDO empty the look on the light.
2. C-001 two lights cannot be chosen.
3. U-006 the phone CONTROLS list has no names.
4. U-001 a silent light is silent to a screen reader.
5. U-005 engine words in the Fragments panel.
6. U-004 and U-009 Escape does not close two dialogs.
7. C-002 the room name stays on one phone.
8. U-002 the look button's name does not hold its visible text.
9. U-010 a renamed row moves under the finger.
10. R-001 two keys named UNDO on the Looks page.
