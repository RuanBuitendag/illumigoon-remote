# 3. Bram, the owner of every other corner

Bram set the lights up and looks after them: names, scenes, software, schedules and transitions. Test:
`scripts/regression/stories/corner-owner.mjs`.

### P3-S1 rename the room and a light, and the names stay

Features: Room settings, Rename and arrange. Contexts: phone, page reload. Should take: 3 taps and a name.

1. `Room settings`, `Rename and arrange`. `Room name`: "Living room". `Name of Front Left`: "Window".
2. The light takes the name Window.
3. After a reload Home shows `Open Living room`, not Lounge, with Window among its lights (finding 65).

- **Failures:** the page reloads.
- **Wrong actions:** an empty room name is ignored.
- **Changes of mind:** none.

### P3-S2 schedules on lights with old software say what to do

Features: Schedules, Light software. Contexts: phone, light software too old for schedules. Should take: 3 taps.

1. Room settings says Schedules "Not on these lights".
2. Schedules says the lights "need newer light software".
3. `LIGHT SOFTWARE` opens Light software with each light's version (findings 22, 63).

- **Failures:** old light software.
- **Wrong actions:** none.
- **Changes of mind:** none.

### P3-S3 save a scene, change the room, and bring the scene back

Features: scenes. Contexts: phone, Home. Should take: 2 taps and a name to save, 1 to apply.

1. `+ SAVE`: `SAVE` cannot be pressed without a name. "Test evening", `SAVE`.
2. `Lounge power` off. A tap on Test evening turns all four on again, still on Candle (findings 58, 61, 62).

- **Failures:** none.
- **Wrong actions:** SAVE with no name.
- **Changes of mind:** the room changed, the scene puts it back.

### P3-S4 a change of mind closes the scene sheet with Escape

Features: scenes. Contexts: laptop keyboard. Should take: 1 key.

1. `+ SAVE`, a name, then Escape: the sheet closes and no scene is saved.

**GAP 6, fixed 4 Nov 2026:** Escape closes the Save scene sheet, as CANCEL does.

- **Failures:** none.
- **Wrong actions:** the sheet opened by mistake.
- **Changes of mind:** Escape.

### P3-S5 new light software is told in Settings, and Home stays clear

Features: Settings, Light software. Contexts: phone, a newer version on the server. Should take: 0 taps to dismiss.

Changed 9 Nov 2026 (UX-10): Home had a notice for every person; the software is a job for the owner, in Settings.

1. Settings says "New light software" on the Lounge row.
2. Home has no software notice. `Open Lounge` and `Lounge power` can be pressed; nothing lies over them (finding 5).
3. Room settings says "New version for 4 lights".

- **Failures:** new software on the server.
- **Wrong actions:** none.
- **Changes of mind:** none.

### P3-S6 a starred look shows in the room Favourites after a reload, and a deleted one leaves

Features: stars, Favourites, Mine, MANAGE. Contexts: phone. Should take: 1 tap to star, 3 taps to delete.

1. The room shows FAVOURITES and + SCENE, with no line that explains the star (9 Nov 2026).
2. Keep a look as "Test gone". On Looks, tap its star: it shows under FAVOURITES and does not play (LIFE-1965).
3. Back on the room, Test gone is in Favourites, and stays there after a reload.
4. Looks, `MANAGE`, `DELETE`, `TAP AGAIN TO DELETE`, `DONE`.
5. The room no longer shows Test gone (E10).

- **Failures:** none.
- **Wrong actions:** DELETE asks for a second tap.
- **Changes of mind:** none.

### P3-S7 set how a look fades in, try it, and the room keeps it

Features: Transition. Contexts: phone, page reload. Should take: 2 taps and a slide.

1. Room settings says Transition "Crossfade, 0.3 s". `Transition`, Style `Wipe`, Length to the end: every light
   takes a 10 s wipe.
2. `TRY IT` plays the look again on the lights.
3. After a reload Room settings says "Wipe, 10.0 s" (finding 64).

- **Failures:** the page reloads.
- **Wrong actions:** none.
- **Changes of mind:** none.
