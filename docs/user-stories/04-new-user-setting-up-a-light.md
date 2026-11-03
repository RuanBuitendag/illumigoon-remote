# 4. Lior, the new user setting up a light

Lior has a new light still on its own Wi-Fi. These stories are the setup journeys that were already in
`scripts/regression/journeys.mjs`; each test there carries the name in the last column.

| Story | What Lior does | Failures, wrong actions, changes of mind | Journey |
| -- | -- | -- | -- |
| P4-S1 | `+ Add a light`, `Find the light`: "Found light" | a light with no Wi-Fi | A light with no Wi-Fi is found on its own Wi-Fi |
| P4-S2 | Name, room, home Wi-Fi and password, `Connect light` | | A light on its own Wi-Fi takes the home Wi-Fi at once |
| P4-S3 | Types slowly while the light sends no heartbeat | a silent light | A slow typist still sets up a light that sends no heartbeat |
| P4-S4 | The form keeps what he typed while the light drops and returns | the light drops | The form stays open while a silent light drops and returns |
| P4-S5 | A house with no lights sets up its first one | empty house | A house with no lights yet can set up its first light |
| P4-S6 | The app says when the light has joined the home Wi-Fi | | The app says when a light has joined the home Wi-Fi |
| P4-S7 | A light still on its own Wi-Fi does not count as joined | the light never joins | A light still on its own Wi-Fi does not count as joined |
| P4-S8 | `FLASH IT` to see which light it is, then `STOP` | | A light on its own Wi-Fi flashes before it gets a name |
| P4-S9 | Light setup, `RESTART` | the light restarts | Light setup restarts a light, and it comes back |
| P4-S10 | Light setup, `WI-FI`, `Change Wi-Fi` | | Light setup moves a light to another Wi-Fi and keeps its password |
| P4-S11 | Light setup, `RESET`, `CANCEL`, then `RESET DESK` | a change of mind first | Light setup asks before a reset, and then the light is gone |
| P4-S12 | A master light reports a new one; `Add light` | | A master reports a new light, and the app adds it |
| P4-S13 | `Add address` for a light the search did not find | | An address that answers becomes a light |

Features: Add a light, own Wi-Fi form, Light setup. Contexts: phone, fake lights at `192.168.4.1` (own Wi-Fi) and
`10.0.0.x` (home Wi-Fi). Should take: under a minute from `+ Add a light` to a named light.

Only made-up names, Wi-Fi names and passwords are used ("Test Wi-Fi", "test-password").
