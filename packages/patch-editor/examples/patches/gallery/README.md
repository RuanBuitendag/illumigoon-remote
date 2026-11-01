# `gallery/` — fifty-two presets

`ports/` proves the graph can express the fourteen flat animations. `showcase/` proves each
mechanism works on its own. Neither is a set of looks somebody would run in a room, and since
what the app draws of a preset is its user surface (see [PATCH_SURFACE.md](../../../PATCH_SURFACE.md)),
what the app can *be* is bounded by how many good presets exist. These are authored as finished
looks rather than as demonstrations.

Send one:

```
node tools/send-patch.mjs 192.168.0.5 docs/examples/patches/gallery/44-newtons-cradle.json
```

## Five rules, all enforced

`npm run check:gallery` in `tools/patch-editor` compiles the real `PatchDoc` and runs every
document through it. It is stricter than `check:roundtrip`, which compares the firmware against
the *editor* and therefore cannot see a `dst` that fails to resolve — both sides drop it and the
counts agree. This compares each document against **itself**: everything it declares has to come
back.

### 1. Saturation and value at 2.0, always

`Palette::transform` does `s = clamp01(s * saturation)` and `v = clamp01(v * value)`, so 1.0 is a
no-op that takes each entry at face value and 2.0 — the top of the declared range — drives every
entry to its pure hue at full brightness. Only the HUE is then left to the entry.

Dimming is `layer.opacity`'s job. A `palette.value` below 2 is almost always somebody reaching
for the wrong knob, and washed-out or near-white entries read as grey mud on a WS2812B. Black is
still allowed where it means *off* — the terminal stop of a particle's age envelope needs it, and
`v * 2` is still 0.

### 2. No evenly-spaced hue rings

An eight-hue ring at 45° spacing is what a palette looks like when nobody chose it. Every palette
here is a named relationship with a **minority accent** — the far hue gets one entry out of four
or five, so it lands at one end of the ramp instead of owning a third of the strip. The check
computes the spread of gaps between hues and fails a palette whose gaps are too even.

| Scheme | Shape | Used by |
|---|---|---|
| tight analogous | 3–4 hues inside ~60°, reads as one colour with depth | `35-iris`, `36-undertow` |
| split complement | a close pair plus one hue 150–210° away | `05-posterize`, `26-arpeggio` |
| complementary dyad | two hues at 180°, maximum tension | `07-outer-glow`, `47-two-trains` |
| triad | three at 120°, only where all three need equal weight | `22-bitcrush` |

### 3. Cross-modulation in every patch

Without it a patch is a list of independent LFOs, which is the thing this group exists not to be.
Two shapes count. **Source-level**: a row whose `dst` is `M<i>.<key>` from a non-macro source —
one modulator driving another's rate, level, smoothing or slew. `resolvePath` handles the
address, so `envelope → M2.rate`, `lfo → audio_band.lo`, `lfo → threshold.level` and
`sample_hold → M.slew` are all one row. **Row-level**: an `op: "multiply"` row, which `resolve`
applies on top of whatever the additive rows already put on that target — a product of two
sources. `51-prism-five` is built entirely on the second kind and has no source-level chain.

Several go further and point a chain *backwards* up its own signal path: `20-reverb-tail` has its
envelope raise the threshold that triggers it (a room masking its own detail), and
`28-kick-comet` has its envelope smooth the band it is derived from (a gate's hold time).

### 4. At least one warp, and at least one row moving it

Warps are half the engine and the easiest half to forget — an emitter plus a palette is a
complete-looking patch. A static warp is a shape decision rather than an animation, so the check
also requires that something drives one.

### 5. Speed and Colour on the user surface

The phone draws a preset's `surface` and nothing else (LIFE-867), so every preset hands a person
the same two controls: a control on the `speed` macro's knob and one on `colour`'s, each a 0–100 %
slider over the knob's 0–1 (`lo` 0, `hi` 1, target `M<slot>.knob`). The check fails a document
with no surface, two controls sharing a key or a target, a Speed or Colour macro not on it, and --
through the firmware, like everything else here -- a control whose target does not resolve.
`scripts/migrate-surface.mjs` wrote them from the named macros.

## Speed and Colour on all fifty-two

Every preset has the same first two knobs, and they work through a mechanism worth understanding
before copying it.

A rack knob writes ONE value to every target it names, so a knob over five modulator rates would
set them all *equal* and flatten the detuning most of these patches are built on. That is the
reason for the indirection, and it did not change when `PatchDoc::MACRO_TARGETS` went from 4 to
8 — reaching five rates is now allowed and still wrong. `MacroSignal` solves it: its `knob` is a
plain 0..1 matrix **source**, so

- `M7` is a `macro` modulator, and the user control `speed` writes `M7.knob` — one target;
- matrix rows with `src: 7` fan that out to five rates at five different **depths**, so the
  ratios between them survive the whole sweep.

Base rates are set to roughly a quarter of the intended value with a depth of about 1.5× it, so
the default knob at 0.5 gives the intended rate and the full sweep is about 7:1.

The indirection is required whenever the targets want DIFFERENT depths; a knob that genuinely
wants one value in eight places can now say so directly. `51-prism-five` spends all eight
modulator slots on five sines, a band, a drift LFO and Speed, so its Colour knob reaches four
layers directly and the fifth is deliberately anchored — the four rotate against it. That
anchoring was a choice rather than the cap even when the cap was 4, which is why it stands. The
check accepts that form and notes it as a missed opportunity only when a slot was free.

`M6` does the same for hue, with **opposite signs per layer** — turning Colour walks the layers'
hue *relationship* through analogous, complementary and back rather than rotating the whole strip
as one block.

No conflict with the rule that a macro must not target what a matrix row also targets
(`ModMatrix::resolve` reseeds from base every frame and would overwrite the knob): the user
control owns `M<n>.knob`, and the rows own everything downstream of it.

## Coverage

Across the fifty-two:

| | |
|---|---|
| emitters | line 41, wave 25, spawner 21, block 19, perlin 14, particles 8, bodies 2 |
| warps | mirror 28, translate 22, tile 20, scale 14 |
| blends | add 68, screen 57, multiply 3, erase 2 |
| LFO waves | sine 91, perlin 51, ramp_up 24, triangle 10, sample_hold 8, ramp_down 3, square 2 |

`51-prism-five` is the one patch built entirely on `op: "multiply"` and worth reading for it: five standing waves each pulsed by its own sine at a fifth of a turn apart, with a bass band multiplying all five. Its layer opacities are based at **0.0**, which is what makes the bass scale the modulation DEPTH rather than the brightness — `resolve` seeds from base, accumulates the additive rows, then multiplies, so with no base in the value there is nothing but modulation left to scale.

`multiply` and `erase` are otherwise deliberately rare — they are for shadowing and for punching holes, and
a corpus that used them freely would be a corpus of muddy patches. `periodic` appears once
(`44-newtons-cradle`) because `LfoSignal` fires on its phase wrap AND carries a writable `phase`,
which `periodic` does not: `19-delay-taps` needs four clocks at one tempo with fixed offsets and
only an LFO can be that.

## Two engine bugs shaped what could be written

- **LIFE-698** — `LfoSignal::seed` is not in the document, so two `sample_hold` sources in one
  patch draw the *identical* sequence. Most patches here use only one. `26-arpeggio` uses two
  deliberately and says so in its notes: because the second's rate is set by the first, it plays
  the same notes at a continually changing speed, which is a canon rather than counterpoint.
- **LIFE-726** — a source flickering `layer.opacity` at a high rate reboots a device, with
  brownout and render-loop overrun the open hypotheses. `21-gate-stutter` is the patch that would
  reproduce it, so its rate defaults to 4 Hz, its Speed knob stops near 12, and its `slew` never
  reaches 0.

## One gap found while writing these

`ReverseWarp` exists in `warp.h` and is absent from `WarpNodes`, so no document can build one —
the same shape of gap `ports/README.md` records for `SpectrumSignal`. Nothing here needs it
(`mirror` at `centre` 0 or 1 is a reverse), but it is advertised nowhere and buildable nowhere,
which is worth knowing before somebody tries.
