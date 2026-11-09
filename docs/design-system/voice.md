# Brand, voice and words

Written on 4 Nov 2026 from what the app and the Edit page already do (LIFE-1956). Ruan can overrule any line. Each
rule names where the app already follows it, so a new screen can copy it.

## Principles (BR-1)

| Principle | What it means | What follows from it | Where it shows now |
| -- | -- | -- | -- |
| The light is the picture | The LED strip drawing is the main thing on a screen. Text and controls stay quiet around it | No coloured accents in the chrome, no tinted cards, no orange or amber. Colour on screen comes from the lights | `.led-strip`, `illumigoon-no-tinted-cards`, `--warn` is grey |
| Lit means live | Ink is full only for what is on or playing now, and for the one primary key of a screen or sheet (D98). What is off or waiting is a step down the text ramp | A control that is off uses `--text-4` or `--thumb-off`, not a new colour | `.fader[data-lit]`, `.power-key[data-checked]` |
| Flat | No shadow for depth except a sheet or notice that floats over a screen | Hairlines (`--line`, `--track`) divide; a faint `--wash` marks something raised | the editor's header in `packages/patch-editor/src/styles.css` |
| Say a thing once | One fact has one place on a screen | A dot that says a light is silent is not repeated as a sentence | `no-duplicated-information` standard, the room light rows |
| No small print | Every line of text is there to be read | No footnotes, no caveats, no read times. Text never goes under `--size-small` | `--size-small` is the floor (LIFE-1938) |

## Voice (BR-4)

The app speaks like a person who knows the lights well and is in the room with you: short, plain, calm.

| Moment | Tone | Example from the app |
| -- | -- | -- |
| A label or a key | Short, plain, capitals for keys | `EDIT`, `LOOKS`, `+ SAVE`, `UNDO` |
| Describing a look | One sentence of what you will see, no adjectives about quality | "Rain that swells and eases, with lightning now and then." |
| A state | What is true now, in the present tense | "These lights are off.", "In use on another device" |
| Something went wrong | What happened and what still holds, no blame, no codes | "Could not reach the clipboard" |
| Waiting | What is happening, and what you will see | "Updating. The light restarts and shows its progress on its strip." |
| Asking first | The question, then what it costs and how to take it back | "Remove all 3 layers? … UNDO brings them back." |

Do not write: exclamation marks, "Oops", "Successfully", "Please", jokes in errors, or error codes and file names in
the app's screens.

## Style (BR-5)

- Sentence case for headings, notes and descriptions. Capitals only for keys and small labels, which the type token
  `--type-label` and its letter spacing draw.
- A key is a verb or a noun the person knows: `SAVE`, `RENAME`, `TRY IT`. A key that adds starts with `+`.
- A description ends with a full stop. A label, a key and a state shown alone do not.
- Times use the 24-hour clock with a colon, `06:00`. Durations use words: "in 20 minutes".
- Numbers a person reads are whole: brightness `100`, not `1.0`. Units follow with a space where they are words.
- British spelling: colour, centre.
- No file names, hex codes, byte counts or ids in the app's screens. The Edit page may show a byte count only where
  a person must keep a look under the light's size limit.

## Words (BR-6)

One word for one thing. Use the left column, never the right.

| Say | Means | Do not say |
| -- | -- | -- |
| light | one Illumigoon LED strip with its controller | device, lamp, bulb, node, strip (for the whole light) |
| strip | the row of LEDs on a light, or its drawing on screen | bar, line |
| room | a named group of lights | zone, group |
| look | what a light plays: colours and motion | preset, animation, effect, patch (outside Edit) |
| scene | the saved looks and levels of every light in a room | snapshot, mood |
| colours | the colour set a look uses | palette (outside Edit's palette store), gradient |
| level | how bright a light is, 0 to 100 | intensity, dim value |
| light software | the program on a light | firmware, OTA |
| device | the phone or laptop the app runs on | (never a light) |
| Edit | the page that changes how a look is made | patch editor (in the app) |
| layer | one part of a look in Edit | slot, track |
| fragment | a saved layer that Edit can add to another look | snippet, layer preset, part |
| variation | where a look's controls sit, kept under the look in Edit | preset |
| Mine | the looks a person saved | user presets, custom |

## Media and senses (BR-12, BR-13, BR-14)

- Photos: the app uses none. A light is shown by its strip drawing, never by a photo.
- Haptics: none. A press shows by the key moving (`button[data-held]`), which works the same on the laptop.
- Sounds: none. The lights listen to music; the app makes no sound of its own.
