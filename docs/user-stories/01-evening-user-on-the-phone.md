# 1. Noa, the evening user on the phone

Noa comes home, opens the app on her phone and wants the Lounge warm and on. She never opens Edit. Four lights in the
Lounge: Front Left, Front Right, Back Left and Back Right, all playing Candle. Test: `scripts/regression/stories/evening-user.mjs`.

### P1-S1 open the Lounge from Home while a light is still waking

Features: Home, room card, room screen. Contexts: phone, Back Right switched on at the wall a moment ago.
Should take: 1 tap, and the card does not move under the finger.

1. Home shows the Lounge card with Back Left, Back Right, Front Left and Front Right.
2. Back Right wakes up after the app has drawn Home. The card and its `Lounge look: Candle` button stay where they are.
3. She taps `Open Lounge`. All four lights are chosen.
4. `Rooms` takes her back to Home.

- **Failures:** a light is off at the wall when the app opens, and wakes 3 s later (finding 1).
- **Wrong actions:** she taps while the card is still filling.
- **Changes of mind:** back to Rooms at once.

### P1-S2 turn the Lounge off, try the level, and turn it on again

Features: room power, level. Contexts: phone, all lights on. Should take: 1 tap each way.

1. `Lounge power` turns every light off.
2. The `Lounge brightness` slider cannot move while the room is off, and OFF is not said once per light.
3. `Lounge power` again turns every light on, at the level they had.

- **Failures:** none injected; P5-S1 covers a silent light.
- **Wrong actions:** she tries the level while the room is off (finding 13).
- **Changes of mind:** on again straight after off.

### P1-S3 play Starfield from the Looks page, then undo it

Features: Looks page, PLAYING, undo bar. Contexts: phone, Candle playing. Should take: 2 taps to play, 1 to undo.

1. `Lounge look: Candle` opens Looks.
2. A tap on Starfield plays it on every light. PLAYING shows once, on Starfield.
3. `UNDO` on the bar brings Candle back on every light.
4. `Lounge` goes back to the room, which says Candle.

- **Failures:** none injected.
- **Wrong actions:** the wrong look (Starfield instead of Candle).
- **Changes of mind:** UNDO.

### P1-S4 search for a warm look

Features: Looks search. Contexts: phone. Should take: a word and one tap.

1. `Search looks`: "warm" finds Dark Embers by its description; "flame" finds Candle.
2. A word that matches nothing shows no looks; clearing the field brings the groups back.

- **Failures:** none.
- **Wrong actions:** a search for a look that does not exist.
- **Changes of mind:** clear the search.

### P1-S5 change one light, then the whole room again

Features: light choice, Looks page. Contexts: phone. Should take: 3 taps.

1. A tap on Front Left chooses only that light. Looks says `On Front Left`.
2. Starfield plays on Front Left only; Back Left keeps Candle.
3. Back in the room, `CHOOSE ALL` chooses all four. Looks says `On Lounge`, and Candle plays on all four.

- **Failures:** none.
- **Wrong actions:** the look goes to one light when she meant the room.
- **Changes of mind:** back to the whole room.

### P1-S6 a saved look keeps its name after a reload

Features: look controls, SAVE AS NEW, Mine. Contexts: phone, page reload. Should take: 3 taps and a name.

1. `Speed` to the end; `SAVE AS NEW` offers a name; she types "Test fast candle" and presses `KEEP`.
2. After a reload the room still says Test fast candle, and Looks shows it PLAYING.

- **Failures:** the page reloads (findings 4, 8, 16).
- **Wrong actions:** none.
- **Changes of mind:** none.

### P1-S7 give the two front lights one look

Features: light choice. Contexts: phone. Should take: 2 taps to choose, 1 to play.

1. A tap on Front Left, then `Choose Front Right`: both front lights are chosen.
2. Starfield plays on the two front lights.

**GAP 1 (finding 10), fixed 4 Nov 2026:** with one light chosen, a tap on another light adds it. A tap on a chosen light takes it out, and taking out the last light chooses the whole room again.

- **Failures:** none.
- **Wrong actions:** none.
- **Changes of mind:** none.
