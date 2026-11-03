/** What the editor knows about a parameter beyond what the firmware says of it. */

export interface Presentation {
  /** A plainer name than the one the firmware publishes, where that one is a code word. */
  label?: string;
  /** Caption when the section heading already carries the context. */
  short?: string;
  /**
   * What the number MEANS, shown beside the value and at the top of the tooltip.
   *
   * `strip` is the normalised strip: 1 is its whole length, so a size of 0.012 is about a
   * hundredth of it whatever the LED count. That is the unit most of the geometry here is
   * in, and the one nobody guesses -- a bare `0.35` beside Launch Speed reads as a fraction
   * of something rather than a third of the strip every second.
   */
  unit?: string;
  /**
   * What moving this knob does, in a sentence or two.
   *
   * PRESENTATION RATHER THAN FIRMWARE, which is a size argument before it is a taste one.
   * The device never reads these, and the six catalog responses cross the mesh as 250-byte
   * ESP-NOW chunks against a 32-chunk ceiling. Eighty-odd sentences is roughly 6 KB and
   * would not fit, so the wire keeps carrying the contract and the prose lives beside the
   * tool that draws it.
   *
   * Written from the emitter and signal sources rather than from the labels, because the
   * label is the thing that was not saying enough.
   */
  desc?: string;
  /**
   * Display taper: `value = min + (max-min) * t^curve`.
   *
   * DISPLAY ONLY -- the wire value is untouched. `lfo.rate` is 0-40 and 1 Hz lands at 2.5%
   * of a linear sweep; a gamma of 3 moves that to about 29%. Only honoured when the low end
   * is >= 0, since a range centred on zero would lose its symmetry about the centre.
   */
  curve?: number;
  /**
   * Dial range for parameters whose true range is an accumulator rather than a dial.
   * Modulation reach and clamping still use the device's min/max.
   */
  soft?: [number, number];
  /** Rendered with more decimals than the default two. */
  step?: number;
  /** Shown as 0 to 100 across its range rather than as the number the light stores. */
  percent?: boolean;
}
