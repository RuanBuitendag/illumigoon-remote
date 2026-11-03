# 5. The same features in other contexts

Features from the other files, with one thing changed. Test: `scripts/regression/stories/other-contexts.mjs`.

### P5-S1 play a look while one light of the room is off at the wall

Features: silent light, Looks page. Contexts: phone, Back Right off at the wall. Should take: as P1-S3.

1. Back Right stops answering; its name on the Lounge card gets the silent mark.
2. Starfield from Looks plays on the three lights that answer.
3. Back Right comes back and shows in the room again.

- **Failures:** a light stops answering, then returns.
- **Wrong actions:** none.
- **Changes of mind:** none.

### P5-S2 the Lounge on the laptop: power, level and a look

Features: room screen, Looks page. Contexts: laptop, 1280 by 800. Should take: as on the phone.

1. `Lounge brightness` to the end: every light at full.
2. `LOOKS`, Starfield: every light plays it, and the page fits the window.

- **Failures:** none.
- **Wrong actions:** none.
- **Changes of mind:** none.

### P5-S3 a light name that is too long, or has an emoji, is kept as typed up to the limit

Features: Rename and arrange. Contexts: phone, odd input. Should take: as P3-S1.

1. `Name of Front Left`: "Lamp 🌙 by the long window". The light takes at most 15 characters, emoji kept.
2. The row moves to its new place in name order. A blank name does not replace the light's name.

- **Failures:** none.
- **Wrong actions:** a name over the limit; a blank name.
- **Changes of mind:** none.
