/** The modulators' half of `PARAM_PRESENTATION`. */

import type { Presentation } from './presentationType';

export const MODULATOR_PRESENTATION: Record<string, Presentation> = {
  'lfo.rate': {
    unit: 'Hz',
    curve: 3,
    desc: 'Cycles per second. This one knob decides how fast everything this LFO drives will move.',
  },
  'lfo.phase': {
    unit: 'turns',
    desc:
      'Where in its cycle the LFO currently is. Writable, which is how a room clock keeps ' +
      'several strips swinging together.',
  },
  'lfo.duty': {
    desc:
      'How much of a cycle the square wave spends high. Square only — every other shape ignores ' +
      'it.',
  },
  'lfo.noise': {
    desc:
      'Blends smooth noise into the wave. A little roughens it; 1 is pure noise. Never pushes ' +
      'the output past ±1.',
  },
  'lfo.noiseRate': {
    unit: 'Hz',
    curve: 3,
    desc: 'How fast the noise wanders. Its own clock, so an LFO at Rate 0 still moves.',
  },

  'envelope.attack': {
    unit: 's',
    step: 0.005,
    curve: 3.5,
    desc: 'How long the envelope takes to climb to 1 once it fires.',
  },
  'envelope.decay': {
    unit: 's',
    curve: 3,
    desc:
      'How long it takes to fall back to 0 after the attack. 0 holds at 1 instead, which is the ' +
      'one-shot ramp a transition wants.',
  },

  'delay.time': {
    unit: 's',
    step: 0.005,
    curve: 3.5,
    desc:
      'How long after an edge arrives it fires again. Each edge waits on its own, so a new one ' +
      'never cancels one still on its way.',
  },

  'audio_band.lo': {
    unit: 'bin',
    step: 1,
    desc:
      'The lowest FFT bin in the band. Bin 0 is the deepest bass; the useful bass sits under ' +
      'about 8.',
  },
  'audio_band.hi': {
    unit: 'bin',
    step: 1,
    desc:
      'The highest FFT bin in the band. A float rather than a step, so the band can be swept by ' +
      'a modulator instead of only jumped.',
  },
  'audio_band.sensitivity': {
    unit: '×',
    curve: 3,
    desc:
      'Multiplies the band after auto-gain. Above 1 pushes quieter passages up into the top of ' +
      'the range.',
  },
  'audio_band.threshold': {
    desc:
      'Subtracted from the raw band BEFORE auto-gain, so steady room hiss never gets normalised ' +
      'up into a signal. Subtracted rather than gated, which is why it does not chatter.',
  },
  'audio_band.squelch': {
    desc:
      'Anything below this fraction of the band’s recent peak drops to 0. Applied after ' +
      'auto-gain, so one number means the same thing on every band.',
  },
  'audio_band.smoothing': {
    unit: 's',
    curve: 2.5,
    desc:
      'How long the band takes to follow a change. A time constant rather than a per-frame ' +
      'amount, so the feel does not shift with frame rate.',
  },
  'audio_band.agcRelease': {
    unit: 's',
    curve: 2,
    desc:
      'How long a loud passage keeps the band turned down. Short is twitchy; long leaves the ' +
      'strip deaf after a peak.',
  },

  'tempo.slow': { unit: 'BPM', step: 1, desc: 'Music at or below this tempo reads 0 — chilled.' },
  'tempo.fast': {
    unit: 'BPM',
    step: 1,
    desc:
      'Music at or above this tempo reads 1 — fast. Wire Tempo to the Master’s Speed and the ' +
      'whole patch follows the song.',
  },
  'tempo.smoothing': {
    unit: 's',
    curve: 2.5,
    desc:
      'How long Tempo takes to follow a change. Long enough and it follows the song rather than ' +
      'the bar.',
  },

  'beat.decay': {
    desc:
      'How long each pulse lasts, as a fraction of the gap to the next — of a beat, or of a ' +
      'bar. Faster music gives shorter pulses on its own.',
  },
  'beat.nudge': {
    unit: 'ms',
    step: 1,
    desc:
      'Moves every pulse and edge earlier (positive) or later. The microphone hears a hit a few ' +
      'milliseconds late; this takes them back.',
  },

  // One tracker per light, so these are shared: every Tempo and Beat in the patch hands its values
  // over, and the most forgiving wins. LIFE-851.
  'tempo.sensitivity': {
    unit: '×',
    curve: 3,
    desc:
      'Boosts what the tracker hears before it looks for a beat. Turn up when a quiet mic or a ' +
      'soft passage makes it let go.',
  },
  'tempo.threshold': {
    desc:
      'How quiet counts as silence. Below it the tracker stops trusting the beat. Lower it to ' +
      'keep hold through a breakdown; raise it if room noise keeps it locked.',
  },
  'tempo.hold': {
    unit: 'beats',
    step: 1,
    desc: 'How many weak beats it rides through before letting go of the beat.',
  },
  'beat.sensitivity': {
    unit: '×',
    curve: 3,
    desc:
      'Boosts what the tracker hears before it looks for a beat. Turn up when a quiet mic or a ' +
      'soft passage makes it let go.',
  },
  'beat.threshold': {
    desc:
      'How quiet counts as silence. Below it the tracker stops trusting the beat. Lower it to ' +
      'keep hold through a breakdown; raise it if room noise keeps it locked.',
  },
  'beat.hold': {
    unit: 'beats',
    step: 1,
    desc: 'How many weak beats it rides through before letting go of the beat.',
  },

  'periodic.period': {
    unit: 's',
    curve: 3.5,
    desc: 'Seconds between fires. This is the metronome the rest of a patch can hang off.',
  },

  'threshold.level': { desc: 'The value the input must reach for this to fire.' },
  'threshold.hysteresis': {
    desc:
      'How far back below Trip Level the input must fall before it may fire again. This is what ' +
      'stops a noisy signal chattering.',
  },

  // Every modulator has one. A time constant rather than a per-frame amount, so the feel
  // does not change with the frame rate -- and deliberately NOT applied to a trigger edge,
  // which has no value to ease.
  'lfo.slew': {
    unit: 's',
    desc:
      'How long the output takes to catch up with itself. Rounds off a square wave, leaves a ' +
      'sine alone.',
  },
  'envelope.slew': {
    unit: 's',
    desc:
      'Softens the ramp after the curve has shaped it. Useful on a fast attack that snaps too ' +
      'hard.',
  },
  'delay.slew': {
    unit: 's',
    desc: 'Eases the carried value from one edge to the next. The edge itself stays instant.',
  },
  'audio_band.slew': {
    unit: 's',
    desc:
      'Extra smoothing after the band is measured. Smoothing is the detector; this is the knob ' +
      'on its output.',
  },
  'tempo.slew': { unit: 's', desc: 'Extra easing on top of Smoothing. Rarely needed.' },
  'beat.slew': {
    unit: 's',
    desc: 'Softens the pulse’s instant rise. The edge itself stays on the beat.',
  },
  'periodic.slew': {
    unit: 's',
    desc: 'Eases the value between ticks. The trigger edge itself stays instant.',
  },
  'threshold.slew': {
    unit: 's',
    desc: 'Eases the on/off value. The edge it emits is unaffected, so a gate stays crisp.',
  },
  'macro.slew': {
    unit: 's',
    desc: 'How long the knob takes to arrive where you put it. 0 is instant.',
  },
  'math.slew': {
    unit: 's',
    desc: 'Eases the result. On a comparison the edge stays instant, so a gate is still crisp.',
  },

  // Only `gt` and `lt` read it — the continuous ops have no edge to chatter on. Said here
  // rather than hidden, because the knob is drawn whatever the op is.
  'math.hysteresis': {
    desc:
      'Comparisons only: how far the difference must fall back before the answer may flip ' +
      'again. Stops two close signals flickering against each other.',
  },

  'macro.knob': {
    desc: 'A number you set by hand and wire wherever you like. Nothing moves it but you.',
  },
};
