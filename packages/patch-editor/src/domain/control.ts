/** One control of a patch's user surface, as the document stores it. See `surface.ts`. */

export type ControlType = 'slider' | 'stepper' | 'toggle' | 'select' | 'color_picker' | 'palette';
export const CONTROL_TYPES: readonly ControlType[] =
  ['slider', 'stepper', 'toggle', 'select', 'color_picker', 'palette'];

export interface Control {
  /**
   * What the phone writes: `light_apply_params {"speed": 70}`. Fixed once made -- a Scene stores by
   * it.
   */
  key: string;
  label: string;
  /** The heading it sits under. A heading exists only as the controls that name it. */
  group?: string;
  type: ControlType;
  /** The address it writes, in the grammar a matrix row's `dst` uses. */
  target: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** A select's labels, one per entry in `choices`. */
  options?: string[];
  /** Present: `min`-`max` is laid over `lo`-`hi`. Absent: the published range is the range. */
  lo?: number;
  hi?: number;
  /** With `lo`/`hi` only: `real = lo + (hi - lo) * t^curve`. */
  curve?: number;
  /** A select's wire names, in the order of `options`. */
  choices?: string[];
  /** A toggle whose On is its target's false. `L2.mute` reads backwards to a person. */
  invert?: boolean;
  /** Fields this build does not know, kept so a document from a newer editor loses nothing here. */
  rest?: Record<string, unknown>;
}
