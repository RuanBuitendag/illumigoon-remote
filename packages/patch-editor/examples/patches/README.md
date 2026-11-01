# Example patches

47 patch documents that ship with the firmware. Read-only: `tools/patch-editor` lists and
loads them and never writes back, and `npm run check:roundtrip` / `npm run check:edits` use
them as their corpus — so a patch edited in place here quietly changes what the checks mean.

A preset file **is** a patch document. `PatchDoc::load` reads `layers`, `modulators`, `matrix`
and ignores everything else, so `name` and `notes` ride along for people and cost
the device nothing. Send one with:

```
node tools/send-patch.mjs <device-ip> docs/examples/patches/showcase/03-tide.json
```

## The four groups

| | |
|---|---|
| `*.json` | Eight minimal examples, one mechanism each. Start here to read the format. |
| `ports/` | Fourteen animations of the old flat set, rebuilt as patches. |
| `showcase/` | Twelve patches with no equivalent in the flat animation set. |
| `gallery/` | Thirteen presets authored as finished looks rather than as demonstrations. Its own [README](gallery/README.md) states four rules the group obeys, all enforced by `npm run check:gallery`. |

Groups are **one directory deep**. That is not a convention invented here — `server/library.mjs`
defines a group as exactly one subdirectory and `resolveIn` refuses `group/sub/name.json`.
Anything reading this directory has to walk that one level or it silently sees eight of
forty-one; `harness.mjs` exports `examplePatches()` so both checks walk it the same way.

## `ports/` is a coverage test written as content

The patch engine is additive: `patch.cpp` registers it as one more animation id and none of the
fourteen originals were touched. These exist to answer the question that leaves open — can the
graph actually *express* what those animations do?

All fourteen were rewritten against the current engine under LIFE-835. The set before that was
authored before the global stage, before a macro became a modulator, before `math`, before an
LFO could be restarted from an edge, and before a parameter could be a modulation *source* —
and several had drifted into approximations rather than ports. `14-prism-line` had no sine
swing, which is the entire mechanism of `prism_line`; `10-perlin-audio` had one noise layer
where the animation has two; `12-mirror-brush` had a line bouncing where the animation lays
down a trail; `04-progress-line` and `06-wifi-strength` drew a meter filling from one end where
both animations draw a bar centred on the strip.

### Two rules the whole group now obeys

**A port's macro rack is its animation's `getDefinitions()`.** `ports/13-room-pulse` carries
`freq`, `width` and `tail` because that is what `room_pulse` exposes.

**And a knob sweeps that parameter's declared range.** Row base = the animation's minimum,
depth = max − min, and the knob rests at `(default − min) / (max − min)` — so the ends of the
knob are the ends the animation offered and its rest position is the animation's default. Where
that is not true the file's `notes` says so, and there are only three reasons it happens: a
node's own spec is narrower (`particles.count` stops at 32 against `num_sparks`'s 40, `perlin.scale`
at 40 against `aurora`'s 100), the port was tuned by eye and diverges deliberately
(`05-fireworks`'s sparks), or the units differ (below).

**A row's `depth` has no address, so a parameter that IS a depth gets no knob.** That is the
usual reason one is missing — `max_len` on `08-sine-bass`, `amp_max` and `freq_max` on
`14-prism-line`, `burst_min`/`burst_max` on the two fireworks.

### The four real gaps

Each file's `notes` says where it diverges. These four name a missing node rather than a
compromise:

| Port | What is missing |
|---|---|
| `09-fft-bars` | **No constructible spectrum source.** `SpectrumSignal` is in `sources.h` and gives N outputs from one slot — exactly what a spectrogram needs — but it is absent from `SignalNodes`, so no document can build one (LIFE-675). Against 16 modulator slots that is six bands instead of 512 bins. |
| `14-prism-line` | Same gap. Ten bands become three. |
| `13-room-pulse` | **No room-clock source** (LIFE-676). `LfoSignal::phase` is writable, in its own comment, "so a room clock can drive it" — and nothing wires MeshClock to it, so two strips running this drift apart. The look ports; the point of the animation does not. `03-sine-line` loses `trackRoomPhase()` the same way. |
| `06-wifi-strength` | **No device-telemetry source** (LIFE-683). Nothing reaches RSSI, heap or link state. The meter is here; a macro stands in for the reading. |

And three that are about the shape of the engine rather than a missing node:

- **A perlin emitter's density and its `u` are the same number**, so `palette(u)` arrives
  already scaled by that noise — where `aurora` and `perlin_audio` both look the palette up at
  full brightness and multiply by something else. No emitter can publish a flat density with a
  varying `u`.
- **A toggle is a structural choice and no knob reaches one.** `react_speed`, `react_scale`,
  `react_blend`, `log_scale` and `split` all pick between a constant and a lerp, which here is a
  row depth of zero. Each port takes the branch its animation defaults to and says which.
- **`smoothing` and `squelch` change units.** The animations use a per-frame EMA alpha and an
  absolute pre-gain gate; `audio_band` uses a time constant in seconds and a *relative* squelch
  after the auto-gain, because that node is `prism_line`'s gain staging and the other five
  animations are a degenerate configuration of it. See LIFE-651.

### Four worth reading

`02-aurora` for one trick: a black palette blended `multiply` at layer opacity 0.5 reproduces
the original's `0.5 + noise * 0.5` intensity term exactly, because premultiplied multiply is
`(1 - alpha)` against black and opacity caps alpha.

`03-sine-line` and `08-sine-bass` for the other: `pos = 0.5 + sin * (0.5 - len/2)` is a product
of an oscillator with a parameter, which a row's fixed depth cannot express. It is two rows on
one target — `M0 * 0.5` plus `math(mul, M0, L0.emitter.length) * -0.5` — and it works because a
parameter is a SOURCE, not only a sink.

`05-fireworks` for the burst that lands where the rocket stopped. A spawner with `acceleration`
0 and drag `d` asymptotes at `velocity / d`, so ONE `sample_hold` LFO driving both the rocket's
`velocity` and the burst's `origin` makes the two agree by construction — and because
time-to-reach-a-fraction depends on `d` alone and not on the launch speed, a fixed delay on the
burst clock is correct for a low shot and a high one alike. Nothing in the engine turns "this
shape died" into an edge; this is what to do instead. Its rack is capped at five knobs by the
paste, not by taste: the patch is two mirrored halves, and lifting a spark layer out has to
leave enough free modulator slots to drop it back in. A layer group (LIFE-708) would give them
back.

`11-fireworks-audio` for what one beat can drive. `audio_band → threshold` is the beat, and that
single edge triggers the rocket, restarts a rate-0 `sample_hold` so a new height is drawn on the
hit *and only* on the hit, and enters a `delay` whose Time is the flight — carrying that height
on its second wire, so the burst lands at *this* rocket's height even after the next beat has
drawn another. It used to time the flight with `envelope → threshold`, and an envelope has one
voice: every beat inside the flight restarted it, and at 120 BPM no rocket ever burst (LIFE-839).

## `showcase/` is what the flat animations cannot do

| | |
|---|---|
| `01-ember-drift` | Fire under a drifting noise shadow. Macros as the performance surface. |
| `02-comet` | A warp chain doing work the emitter never hears about. |
| `03-tide` | Two near-identical waves beating against each other — only watchable because `WaveEmitter` integrates exactly instead of point-sampling. |
| `04-beat-bloom` | The full converter chain: band → threshold → envelope → scale warp. |
| `05-ladder` | Two warps in series, and the difference between `ColourIndex::Position` and `U`. |
| `06-searchlight` | `erase` punching a moving hole in a lit strip. |
| `07-wah` | An LFO walking an audio band's `lo`/`hi` up the spectrum. |
| `08-cascade` | An LFO modulating another LFO's rate. |
| `09-desk-lamp` | A macro rack: three named knobs, no matrix rows over what they touch. |
| `10-parallax` | Three noise fields at different scales and drift rates. `offset` scrolls, `time` boils. |
| `11-ball-pit` | Eight balls in a lit tube, kicked by the bass. Things that occupy space, collide, and settle. |
| `12-sparkler` | One LFO drives a bright tip AND the particle stream's origin, so the trail is history rather than a drawing. |
| `13-nebula` | Noise magnified seven times past Nyquist, and a palette that is a genuine ring. |
| `14-downpour` | A modulated emission RATE, a noise layer that dims by multiply rather than paints, and a storm: the `04-beat-bloom` converter chain with a DIE where the microphone was, an `op: "multiply"` row that shakes a flash without lighting the dark between strikes, and thunder whose delay is an envelope’s ATTACK. |
| `15-confetti-cannon` | A mirror folding one burst into two, and `random` colouring off an eight-hue wheel. |
| `16-fireflies` | Particles that do not move. The palette is the envelope `fade` cannot give them. |
| `17-prism-wheel` | `wrap`, `paletteSpan` and a cycling `paletteOffset` together, moving against the emitter. |
| `18-lava-lamp` | A palette that thresholds a noise field into blobs, so merging and splitting cost nothing. `evolve` boils, `offset` travels, and a sine's turning points are the hesitation at each end. |
| `21-prism-fan` | `20-prism` with a clock per line, and a rack knob that scales five modulation depths at once. A `macro` signal standing in for the `depth` a row does not expose, with the bass on the knob. |

## Every patch carries a macro rack, and its knobs are on the user surface

`docs/PATCH_SURFACE.md` is the reason: the app draws a patch's user surface and nothing else,
so a patch with no `surface` arrives on a phone with no controls on it. Every named macro here is
exposed as a control -- `key` its name, a 0-100 % slider over the knob's 0-1 (`lo` 0, `hi` 1),
target `M<slot>.knob` -- written by `tools/patch-editor/scripts/migrate-surface.mjs` (LIFE-867).

**A macro is a modulator slot with a `name`** (LIFE-739). It used to be a separate `macros`
block holding target paths and writing its value into each one verbatim; now it is a `macro`
node in the same rack of sixteen as every LFO, reaching its targets through matrix rows. The
phone reaches it through the control that exposes it -- `light_apply_params {"speed": 70}` --
and no longer by its bare name, which a surface key owns now.

Three rules of the old rack are gone with it, and they were the rules that shaped this corpus:

- **The 4-target cap is gone.** `ports/09-fft-bars` and `showcase/20-prism` shipped without a
  rack because a knob could reach four of their six or five identical parameters and leave the
  rest behaving differently. A macro drives as many rows as `ROWS` allows.
- **The shared range is gone.** A macro's `min`/`max` was one range imposed on every target,
  which is why a knob over two things measuring different quantities was a knob that spent most
  of its sweep clamped. Each row now scales its own destination against that parameter's own
  spec, so one 0-1 knob can sweep a `speed` over 0-5 and a `scale` over 0.1-100 at once.
- **Rates that are deliberately unequal can now be grouped.** `applyMacro` wrote one value to
  every target, so a macro over two LFOs made them equal -- which is why `ports/05-fireworks`
  (0.33 against 0.40 Hz), `showcase/18-lava-lamp` (0.012 against 0.019) and `showcase/13-nebula`
  had no speed knob at all. Per-row depth keeps the ratios, so those patches can have one.

The knob also **offsets rather than asserts**. A row computes `base + v * depth`, so knob-zero
leaves a parameter at its base instead of forcing it to zero, and two rows on one target sum.
The migration set each base to the old macro's minimum, which is what made the change invisible.

What a rack is made of, in practice:

| | |
|---|---|
| `M<i>.rate`, `M<i>.period` | The speed knob. `resolvePath` takes modulator paths, so an LFO's rate is as addressable as a layer parameter — and for a patch whose motion is one LFO, this is the knob. |
| `M<i>.sensitivity` | On anything audio-reactive, the one control a room actually needs. |
| `palette.value`, `layer.opacity` | Brightness and the amount of an overlay. |
| emitter `length` / `count` / `rate` | Size and density — what the flat animation would have called its parameters. |

**A port's rack is its animation's parameter list**, and a knob sweeps that parameter's declared
range. That is stated in full, with the arithmetic and the three reasons a knob's ends differ
from the animation's, under `ports/` above.

**Rates that are deliberately unequal used to be ungroupable**, and several patches here still
reflect that: `ports/05-fireworks` runs its launchers at 0.33 and 0.40 Hz so they do not beat
together, `showcase/18-lava-lamp` runs 0.012 against 0.019, `showcase/13-nebula` runs four
incommensurate LFOs, and none of them was given a speed knob. Per-row depth removes the reason.
Adding one to each is worth doing and has not been done.

## Two rules these documents obey

**Two rows on one parameter simply sum**, macro or not. This section used to carry a rule
against a macro sharing a target with a matrix row, then a correction saying the knob set the
base the row rode on. Both were about a construct that no longer exists: a macro asserted its
value through `setResolved` while a row re-seeded from base, and reconciling the two took real
machinery. A macro is a row now, so there is nothing to reconcile — `resolve()` seeds each
target from its base and accumulates every row that names it, in order.

**`bipolar` describes the SOURCE, not the destination.** `resolve()` does
`if (!bipolar) v = v * 0.5 + 0.5`, i.e. it maps a `[-1,1]` reading into `[0,1]`. An LFO is
bipolar and an `audio_band` is not, so an audio row wants `bipolar: true` (pass the 0..1 through)
and `bipolar: false` on one gives it a permanent floor of half the depth. `03-audio-band.json`
and `04-spawner-trigger.json` predate this note and use `false` — deliberately or not, that is
what they get.
