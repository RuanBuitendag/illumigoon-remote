/**
 * How a parameter FEELS and what it MEANS, neither of which the firmware has an opinion about.
 *
 * The device states the contract -- key, label, range, default, overflow, modulatable. None
 * of that says a 0-40 Hz rate is unusable on a linear arc, or that `perlin.time`'s +/-1e6
 * accumulator should be dialled over +/-20, or that `spawner.velocity` is a third of the
 * strip per second rather than a third of anything else. That is this file, and it is
 * deliberately PARTIAL: a node the firmware gains but this file has never heard of renders
 * with a linear knob, two decimals and no blurb, rather than not rendering at all.
 *
 * Keyed `"<nodeId>.<paramKey>"`.
 */

import { MODULATOR_PRESENTATION } from './presentationModulators';
import type { Presentation } from './presentationType';

export type { Presentation } from './presentationType';

export const PARAM_PRESENTATION: Record<string, Presentation> = {
  // ------------------------------------------------------------------ emitters
  'line.centre': {
    unit: 'strip',
    desc: 'Where the middle of the segment sits. 0 is one end of the strip, 1 is the other.',
  },
  'line.length': {
    unit: 'strip',
    desc:
      'How much of the strip the segment covers. 0 with some softness is a dot; 1 is the whole ' +
      'strip.',
  },
  'line.softness': {
    unit: 'strip',
    desc: 'How far each end fades out past the flat core. 0 is a hard edge.',
  },

  'block.level': {
    unit: 'strip',
    desc: 'How far the fill reaches from its anchored end. This is the meter reading.',
  },
  'block.softness': {
    unit: 'strip',
    desc: 'How much the leading edge blurs. At 1 the fill is a gradient ramp rather than a bar.',
  },

  'wave.freq': {
    unit: 'cycles',
    curve: 2.5,
    desc:
      'How many full waves fit across the strip. This is a wave in SPACE, not in time — it ' +
      'stands still until Phase moves it.',
  },
  'wave.phase': {
    unit: 'turns',
    desc:
      'Slides the wave along the strip. One turn is one full wave, so modulate this to make it ' +
      'travel.',
  },

  'perlin.scale': {
    unit: 'cycles',
    curve: 4,
    desc: 'How many noise features fit across the strip. Low is broad clouds; high is fine grain.',
  },
  'perlin.evolve': {
    unit: '/s',
    curve: 2,
    desc:
      'How fast the field boils. This is the one that makes a noise layer alive on its own — no ' +
      'modulator needed. 0 freezes it.',
  },
  'perlin.time': {
    soft: [-20, 20],
    desc:
      'Where along its own churn the field currently sits. Evolve already advances this; set or ' +
      'modulate it to push the field somewhere by hand.',
  },
  'perlin.offset': {
    unit: 'strip',
    soft: [-20, 20],
    desc:
      'Slides the existing noise along the strip without changing its shape. The pattern ' +
      'travels rather than churns.',
  },

  'spawner.origin': {
    unit: 'strip',
    desc: 'Where each shape is born. Every spawn starts from exactly here.',
  },
  'spawner.velocity': {
    unit: 'strip/s',
    desc: 'How fast a shape leaves the origin. Negative launches it the other way.',
  },
  'spawner.acceleration': {
    unit: 'strip/s per s',
    desc:
      'Constant push after launch. Negative pulls back toward the origin end, which is what ' +
      'makes an arc.',
  },
  'spawner.drag': {
    unit: '/s',
    desc: 'How fast a shape loses speed. 0 lets it keep accelerating forever.',
  },
  'spawner.length': {
    unit: 'strip',
    step: 0.005,
    desc: 'The flat core of each shape, so these are short lines rather than dots.',
  },
  'spawner.softness': {
    unit: 'strip',
    step: 0.005,
    desc: 'How far each shape fades out either side of its core.',
  },
  'spawner.lifetime': {
    unit: 's',
    curve: 2,
    desc: 'How long a shape lives. 0 means it lives until it leaves the strip instead.',
  },
  'spawner.fadeOut': {
    desc:
      'The fraction of a life spent dimming at the end. Needs a Lifetime above 0 to do ' +
      'anything.',
  },
  'spawner.speedRef': {
    unit: 'strip/s',
    desc:
      'The speed that reaches the far end of the colours; anything faster sits at the end. Only ' +
      'used when Colour By is Speed.',
  },
  'spawner.maxAlive': {
    label: 'Most at once',
    step: 1,
    desc:
      'How many shapes may exist at once. A spawn past the cap recycles the oldest rather than ' +
      'being refused.',
  },

  // A macro is a hand on a dial, and 0 to 100 is how a person reads one (LIFE-1934).
  'macro.knob': { percent: true },

  'particles.origin': { unit: 'strip', desc: 'The centre of the region particles are born in.' },
  'particles.spread': {
    unit: 'strip',
    desc: 'How wide that birth region is. 0 starts them all at exactly the origin.',
  },
  'particles.count': { step: 1, desc: 'How many particles a single trigger releases at once.' },
  'particles.rate': {
    unit: '/s',
    curve: 2.5,
    desc: 'Particles released continuously, per second, with no trigger needed. 0 is trigger-only.',
  },
  'particles.speed': {
    unit: 'strip/s',
    desc: 'The average launch speed. 0 with a Speed Vary above it throws the burst both ways.',
  },
  'particles.speedVary': {
    unit: 'strip/s',
    desc:
      'How far each particle’s launch speed may differ from Speed, either way. Drawn once at ' +
      'birth — this is what turns one launch into a spray.',
  },
  'particles.acceleration': {
    unit: 'strip/s per s',
    desc: 'Constant pull on every particle. Negative pulls back toward the 0 end.',
  },
  'particles.drag': {
    unit: '/s',
    desc: 'How fast particles lose speed. High makes them stall and hang rather than fly.',
  },
  'particles.bounce': {
    desc:
      'How much speed is kept when a particle hits an end. 0 lets them leave the strip; above 0 ' +
      'nothing ever leaves and Lifetime becomes the only way one dies.',
  },
  'particles.size': {
    unit: 'strip',
    step: 0.001,
    desc: 'Half the width of a particle, its falloff included.',
  },
  'particles.sizeVary': {
    desc:
      'How much each particle’s size may differ from Size, as a fraction of it. Drawn once at ' +
      'birth.',
  },
  'particles.softness': {
    desc: 'The fraction of a particle’s size spent fading out rather than solid.',
  },
  'particles.lifetime': {
    unit: 's',
    curve: 2,
    desc: 'How long a particle lives before it disappears.',
  },
  'particles.lifeVary': {
    desc:
      'How much each particle’s lifetime may differ from Lifetime, as a fraction of it. This is ' +
      'what stops a burst dying all at once.',
  },
  'particles.fade': { desc: 'The fraction of a life spent dimming at the end.' },
  'particles.speedRef': {
    unit: 'strip/s',
    desc:
      'The speed that reaches the far end of the colours; anything faster sits at the end. Only ' +
      'used when Colour By is Speed.',
  },
  'particles.maxAlive': {
    label: 'Most at once',
    step: 1,
    desc: 'How many particles may exist at once. Past the cap the oldest is recycled.',
  },

  'bodies.count': {
    step: 1,
    desc:
      'How many balls are on the strip. They are never born and never die — this resizes the ' +
      'set.',
  },
  'bodies.origin': { unit: 'strip', desc: 'The centre of where the balls are first laid out.' },
  'bodies.spread': { unit: 'strip', desc: 'How far apart they start.' },
  'bodies.size': {
    unit: 'strip',
    step: 0.001,
    desc:
      'Half the width of a ball, which is also its mass — a big one shoves a small one rather ' +
      'than trading speeds with it.',
  },
  'bodies.sizeVary': {
    desc: 'How much each ball’s size may differ from Size, as a fraction of it. Held for its life.',
  },
  'bodies.softness': { desc: 'The fraction of a ball’s radius spent fading out.' },
  'bodies.gravity': {
    unit: 'strip/s per s',
    desc: 'Constant pull. Negative pulls toward the 0 end, positive toward the 1 end.',
  },
  'bodies.drag': {
    unit: '/s',
    desc: 'How fast balls lose speed. This is what eventually lets them settle.',
  },
  'bodies.bounce': {
    desc: 'How much speed is kept off the two end walls. 1 never settles; below 1 comes to rest.',
  },
  'bodies.collide': {
    desc:
      'How much speed is kept when two balls hit each other. 1 is a Newton’s cradle; 0 clumps ' +
      'them together.',
  },
  'bodies.kick': {
    unit: 'strip/s',
    desc:
      'The impulse every ball gets on a trigger, thrown away from whichever end gravity points ' +
      'at.',
  },
  'bodies.kickVary': {
    desc:
      'How much each ball’s kick may differ from Kick, as a fraction of it. Redrawn on every ' +
      'kick.',
  },
  'bodies.speedRef': {
    unit: 'strip/s',
    desc:
      'The speed that reaches the far end of the colours; anything faster sits at the end. Only ' +
      'used when Colour By is Speed.',
  },

  // --------------------------------------------------------------------- warps
  'translate.offset': {
    unit: 'strip',
    desc:
      'Slides everything in the layer along the strip. It wraps, so a steadily driven offset ' +
      'scrolls forever.',
  },
  'mirror.centre': {
    unit: 'strip',
    desc: 'The point the layer folds about, so one half is reflected onto the other.',
  },
  'tile.count': { step: 1, desc: 'How many times the layer repeats across the strip.' },
  'scale.zoom': {
    unit: '×',
    desc: 'Magnifies the layer about Centre. Below 1 shrinks it, and negative reverses the strip.',
  },
  'scale.centre': {
    unit: 'strip',
    desc: 'The point the zoom happens about. It stays put while everything else moves.',
  },

  'ripple.amp': { desc: 'How far the sine pushes the layer either way. 0 is off.' },
  'ripple.freq': {
    desc:
      'How many ripples fit across the strip. A wave in SPACE — it stands still until Phase ' +
      'moves it.',
  },
  'ripple.phase': {
    desc: 'Slides the ripple along. One turn is one full wave, so modulate this to make it travel.',
  },

  'pinch.centre': {
    desc:
      'The point space is squeezed toward or spread away from. It is the one place that does ' +
      'not move.',
  },
  'pinch.amount': {
    desc:
      'Positive squeezes the layer toward the centre, so the middle is magnified on the strip. ' +
      'Negative spreads it. 0 is off.',
  },

  'fade.attack': {
    unit: 's',
    curve: 3,
    desc:
      'How long light takes to arrive. 0 is at once; raise it and a jump glides in instead of ' +
      'snapping.',
  },
  'fade.release': {
    unit: 's',
    curve: 3,
    desc:
      'How long light takes to go dark once it has gone — so a moving thing leaves a trail this ' +
      'long. The time is when the tail disappears on the strip, not when it starts fading.',
  },
  'fade.cells': {
    step: 1,
    desc:
      'How finely the trail is remembered. Its own resolution, never the strip’s. The live ' +
      'light always stays sharp; only the part left behind is this coarse.',
  },
  'blur.radius': {
    unit: 'strip',
    desc:
      'How far each point is smeared, as a stretch of strip — so it looks the same on any strip ' +
      'length. 0 is off. Light is spread, not added, so a small spark gets dimmer as it widens.',
  },

  'wipe.at': {
    desc:
      'Where the edge sits. Everything past it is gone. 1 is untouched and 0 is fully wiped, so ' +
      'this is the one to drive for a transition.',
  },
  'wipe.soft': { desc: 'How far the edge fades rather than cuts. 0 is a hard line.' },

  'window.from': { desc: 'The near edge of what survives.' },
  'window.to': { desc: 'The far edge. Below From the window is empty, not inverted.' },
  'window.soft': { desc: 'How far both edges fade rather than cut.' },

  'dissolve.progress': {
    desc: 'How much is left. 1 is whole, 0 is gone — the same direction Opacity and a wipe run in.',
  },
  'dissolve.cells': {
    desc:
      'How many cells the dissolve is cut into, across the coordinate it sees. Its own ' +
      'resolution, never the strip’s — it looks the same on 60 LEDs as on 144. With a tile ' +
      'below it, every repeat gets the full set.',
  },
  'dissolve.seed': {
    desc:
      'Which random order the cells go in. Change it for a different scatter of the same ' +
      'dissolve.',
  },

  'comb.count': { desc: 'How many stripes fit across the strip.' },
  'comb.duty': {
    desc:
      'How much of each stripe survives. 0 is fully closed, 1 fully open, so this is safe to ' +
      'modulate end to end.',
  },
  'comb.soft': {
    desc:
      'How far each stripe feathers, as a fraction of the stripe — so it looks the same however ' +
      'many there are.',
  },

  // ------------------------------------------------------------ colour effects
  'hue.shift': {
    unit: 'turns',
    desc:
      'Turns every colour round the hue wheel — the same wheel the colours’ Hue uses. Wraps, ' +
      'so a driven shift cycles forever.',
  },
  'hue.spread': {
    unit: 'turns',
    desc:
      'How far the hue turns from one end of the strip to the other, about the middle. 1 lays a ' +
      'whole rainbow across it; the centre keeps its colour.',
  },
  'saturation.amount': {
    unit: '×',
    desc:
      'Scales how colourful the light is. 0 is grey, 1 is untouched, above 1 pushes toward pure ' +
      'hues.',
  },
  'invert.amount': {
    desc:
      'How far each colour is flipped to its opposite. 1 is fully inverted. Only lit colour ' +
      'changes — the dark around a shape stays dark.',
  },
  'posterize.levels': {
    step: 1,
    desc:
      'How many steps each of red, green and blue is cut into. 2 leaves eight colours, and a ' +
      'gradient becomes bands.',
  },
  'posterize.soft': {
    desc:
      'How much each band blends into the next. 0 is hard bands; 1 blends them all the way back ' +
      'to the gradient.',
  },
  'duotone.shadow': { unit: 'turns', desc: 'The hue dark colours become.' },
  'duotone.light': { unit: 'turns', desc: 'The hue bright colours become.' },
  'duotone.balance': {
    desc: 'The brightness where the two hues meet. Lower hands more of the light to the Light hue.',
  },
  'duotone.soft': {
    desc:
      'How gradually one hue gives way to the other. 1 is a smooth ramp; 0 is a hard threshold.',
  },
  'duotone.amount': { desc: 'How much of the duotone replaces the original colour.' },

  // -------------------------------------------------------------------- colour
  'colour.paletteOffset': {
    short: 'Offset',
    unit: 'turns',
    desc:
      'Rotates which colour the index lands on. Wraps, so a driven offset cycles the colours ' +
      'forever.',
  },
  'colour.paletteSpan': {
    short: 'Span',
    unit: '×',
    desc: 'How much of the colours the index covers. Above 1 the colours repeat within the shape.',
  },
  'colour.indexBias': {
    short: 'Shift',
    desc:
      'Shifts the index before the colour is looked up, so the whole shape reads further along ' +
      'the colours than it earned.',
  },

  'palette.hueShift': {
    unit: 'turns',
    desc:
      'Rotates every colour around the hue wheel. Wraps, because a hue is an ' +
      'angle.',
  },
  'palette.saturation': {
    short: 'Sat',
    unit: '×',
    desc:
      'Multiplies the colour of every entry. 0 is greyscale, 1 is as authored, above 1 pushes ' +
      'it.',
  },
  'palette.value': {
    unit: '×',
    desc:
      'Multiplies the brightness of every entry. This is the colours’ own level, not the ' +
      'layer’s opacity.',
  },

  // --------------------------------------------------------------------- layer
  'layer.opacity': { desc: 'How strongly this layer contributes to the blend beneath it.' },

  ...MODULATOR_PRESENTATION,
}

/** One line under a node picker entry. */
export const NODE_BLURBS: Record<string, string> = {
  line: 'A soft-ended segment. Its colour coordinate runs along its length.',
  block: 'Fills from one end to a level. A bar, a meter, a wipe.',
  wave: 'A standing sine across the strip. Phase wraps, so it can be driven round.',
  perlin:
    'A noise field, boiling on its own. Evolve sets how fast; Drift slides it along the strip.',
  fire: 'Heat rising and cooling. The colour coordinate is how hot a cell is.',
  spawner: 'Shapes born on a trigger, then living under their own physics.',
  particles: 'A burst of many, each with its own speed, size and lifetime. Or a steady stream.',
  bodies: 'Balls on a line. They bounce off the ends and off each other; the trigger kicks them.',
  translate: 'Slides the layer. Offset wraps, which is what makes a scroll endless.',
  mirror: 'Folds the strip about a centre.',
  tile: 'Repeats the layer N times across the strip.',
  scale: 'Zooms about a centre. Negative zoom reverses — zoom −1 about 0.5 IS a flip.',
  ripple:

      'Displaces the layer by a sine, so a straight thing stops looking straight. Modulate ' +
      'Phase and the ripple travels.',
  pinch:

      'Squeezes the layer toward a point, or spreads it away. The one warp that makes space ' +
      'uneven rather than merely moved.',
  fade:
    'Light arrives and leaves over time, so a moving thing leaves a trail. Remembers what is ' +
    'above it in the rack: above Colour the colours tint the tail, below it the tail keeps ' +
    'its colour.',
  blur:
    'Softens the layer by smearing every point across Radius of strip. Blurs what is above it ' +
    'in the rack; on MASTER, the whole patch.',
  wipe:
    'An edge that removes everything past it. Put a mirror below it and it sweeps from both ' +
    'ends; a tile below it, and every repeat sweeps at once.',
  window:

      'Keeps a band of the strip and drops the rest. Put a mirror below it for two bands, a ' +
      'tile below it for one per repeat.',
  dissolve:

      'Cells vanish in a fixed random order as Amount falls. The order never changes, so it ' +
      'dissolves rather than flickers.',
  comb:
    'Alternating stripes of nothing. On its own it is a comb; with a tile or a mirror below it, ' +
    'it is interference.',
  hue:
    'Turns the light’s colour round the wheel — evenly, or further along the strip. A colour ' +
    'effect: it acts under the Colour row.',
  saturation:

      'Washes the light out toward grey, or pushes it toward pure. A colour effect: it acts ' +
      'under the Colour row.',
  invert: 'Flips each colour to its opposite. Only lit colour changes; the dark stays dark.',
  posterize: 'Cuts each colour into a few steps, so a smooth gradient becomes flat bands.',
  duotone:

      'Repaints the light in two hues by how bright it is — dark toward one, bright toward the ' +
      'other.',
  lfo:
    'A cycle. Swings ±1, and fires an edge each time its phase wraps. An edge on its Source ' +
    'restarts the cycle.',
  envelope: 'Turns a trigger back into a shaped ramp. Fires on its source’s edge.',
  delay:

      'Fires every edge again after Time, carrying what Carry read when that edge arrived. A ' +
      'new edge queues behind the others instead of cancelling them.',
  audio_band: 'Energy in a band of the spectrum, AGC’d and gated. Outputs 0–1.',
  tempo:

      'How fast the music is: 0 chilled to 1 fast. Wire it to Speed and a patch runs with the ' +
      'song. Needs a microphone.',
  beat:
    'A pulse on every beat or every bar, and an edge for anything that fires. Follows the ' +
    'music’s beat, not just its loud moments. Needs a microphone.',
  periodic: 'A metronome. Fires an edge every period, or at random times with Randomness.',
  threshold: 'Turns a continuous source into an edge when it crosses a level.',
  macro: 'A knob you drive by hand, so one gesture can move several parameters.',
}

/**
 * What a two-wire node calls its wires, when "A" and "B" would say nothing.
 *
 * `math`'s wires ARE two operands, so it keeps A and B. A delay's are an edge and a value
 * that rides with it, and "B" over the carry is exactly the wire nobody would think to plug.
 */
export const WIRE_LABELS: Record<string, [string, string]> = {
  delay: ['Edge', 'Carry'],
};

/**
 * What an edge DOES to the node that accepts one, keyed by node id.
 *
 * One wire, three meanings -- `PatchDoc::rewire()` spells them out: a spawner and a
 * particle emitter give birth on it, a body set is kicked by it. The word "Trigger" over a
 * row of slot numbers says none of that, and the absence of the wire is what makes a
 * spawner render nothing at all. Partial like the rest of this file: an emitter it has
 * never heard of gets the picker with no caption.
 */
export const TRIGGER_BLURBS: Record<string, string> = {
  spawner:

      'Every edge gives birth to one shape, which then lives under its own physics. With ' +
      'Sustain on, the shape stays joined to the Origin for as long as the trigger holds.',
  particles:
    'Every edge releases Count particles at once. Rate is the other way in, and needs no trigger.',
  bodies: 'Every edge kicks all the balls away from whichever end gravity points at.',
}

/**
 * The enums and bools, keyed `"<nodeId>.<key>"`.
 *
 * Same gap as the knobs had, one control over: the field carried a label and a tooltip that
 * said only "structural, not a modulation target" -- true, and not what anyone was asking.
 */
export const STRUCT_BLURBS: Record<string, string> = {
  'block.fromEnd': 'Fill from the far end of the strip downward, instead of from 0 upward.',
  'spawner.colouring': 'What the colours read off each shape.',
  'spawner.sustain':

      'While the trigger stays over its threshold, one unbroken line grows out of the Origin. ' +
      'When it dips, the line breaks off and flies on. Needs a Threshold or a Math comparison ' +
      'as the trigger. A trigger that only ticks behaves as if this were off.',
  'particles.colouring': 'What the colours read off each particle.',
  'bodies.colouring': 'What the colours read off each ball.',
  'translate.wrap': 'What leaves one end comes back in at the other. Off, it simply leaves.',
  'lfo.wave': 'The shape the LFO swings through.',
  'envelope.shape': 'How the attack and decay are shaped between their endpoints.',
}

/**
 * The individual options, keyed `"<nodeId>.<key>.<option>"`.
 *
 * These are wire names drawn as a row of buttons -- `sample_hold`, `expo_in`, `random` --
 * and a person reading them cold has only the word. The C++ enums document every one of
 * them; the row of buttons is simply where that never reached.
 */
export const STRUCT_OPTION_BLURBS: Record<string, string> = {
  'spawner.colouring.age':
    '0 at birth, 1 at death. What a firework’s sparks do. Needs a Lifetime above 0.',
  'spawner.colouring.speed':
    '0 stationary, 1 at Colour Speed. Reads well on anything accelerating.',
  'spawner.colouring.index':
    'Which spawn this was, cycling through eight. Consecutive shapes come out different colours.',

  'particles.colouring.age': '0 at birth, 1 at death. Sparks cooling as they fall.',
  'particles.colouring.speed':
    '0 stationary, 1 at Colour Speed. The fast ones read as the hot ones.',
  'particles.colouring.random':
    'A draw held for life, so one burst scatters across all the colours.',

  'bodies.colouring.index': 'One colour per ball, held for its life.',
  'bodies.colouring.speed': '0 stationary, 1 at Colour Speed.',
  'bodies.colouring.height':
    'Where it is on the strip, so a rising ball changes colour as it goes.',

  'lfo.wave.sine': 'A smooth swing. The default, and what most modulation wants.',
  'lfo.wave.triangle': 'Straight up and straight down, with a corner at each end.',
  'lfo.wave.ramp_up': 'Climbs, then snaps back. A sawtooth.',
  'lfo.wave.ramp_down': 'Falls, then snaps back up.',
  'lfo.wave.square': 'Hard between the two extremes. Duty Cycle sets how long it spends high.',
  'lfo.wave.sample_hold':

      'A new random value each cycle, or each time its Source fires, held until the next. At ' +
      'Rate 0 it steps only on the Source.',
  'lfo.wave.perlin': 'Smooth noise. Wanders rather than repeats.',

  'envelope.shape.linear': 'A straight ramp.',
  'envelope.shape.smooth': 'Eased at both ends. The default, and the least mechanical.',
  'envelope.shape.expo_in': 'Slow to start, then rushes.',
  'envelope.shape.expo_out': 'Sharp to start, then settles.',
}

export const BLEND_BLURBS: Record<string, string> = {
  add:      'Glow stacking — what light physically does.',
  over:     'Paints over what is below.',
  screen:   'Lightens without clipping as hard as add.',
  multiply: 'Darkens what is below, by this layer.',
  erase:    'Punches a hole through the layers under it.',
  mask:     'Keeps what is below only where this layer is bright. Black hides it.',
};

export const INDEX_BLURBS: Record<string, string> = {
  u: "The emitter's own coordinate — position along a line, a spark's age, the noise value.",
  density: 'How bright the emitter made this pixel.',
  position:

      'A gradient on the coordinate Colour sees: fixed on the strip below every warp, moved by ' +
      'any warp listed under Colour.',
}

/** How MASTER's Colour row hands its stops to the layers (LIFE-846). Editor only, like the row. */
export const DEAL_BLURBS: Record<string, string> = {
  all:     'Every layer plays all of them, in this order.',
  some:    'Each layer plays a few of them, in this order. Own draws as many as the layer had.',
  one:     'Each layer plays one flat colour. No colour repeats until every one is dealt.',
  shuffle: 'Each layer plays all of them, in an order of its own.',
};

/** Serialised-size thresholds, surfaced as a budget rather than enforced. */
export const BUDGET = {
  /** Over this the patch still runs, but the light returns to factory default after a power cut. */
  NVS: 4096,
  /** Over this the patch cannot reach a device over the mesh. */
  MESH: 8192,
} as const;
