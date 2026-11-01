/**
 * Which part of the editor shows below 900 px, where the bottom tabs do the side column's job.
 *
 * The tabs and the column stay in step both ways: a tab turns the column, and opening a stage from
 * the signal chain turns the tab. At laptop width every part shows and this changes nothing.
 */

import { useEffect, useRef } from 'react';
import type { Side } from '../ui/ctl';

export type EditorSection = 'layers' | 'colour' | 'motion' | 'controls' | 'roll';

/** What the side column shows for a section. Motion does not use it. */
const SIDE_OF: Record<EditorSection, Side | null> = {
  layers: 'fx',
  colour: 'colour',
  motion: null,
  controls: 'user',
  roll: 'randomise',
};

const SECTION_OF: Record<Side, EditorSection> = {
  fx: 'layers',
  colour: 'colour',
  user: 'controls',
  randomise: 'roll',
};

export const sectionOfSide = (side: Side) => SECTION_OF[side];

const isPhoneWidth = () => matchMedia('(max-width: 899px)').matches;

export function useSection(
  section: EditorSection,
  side: Side,
  setSide: (side: Side) => void,
  onSection: (section: EditorSection) => void,
) {
  const last = useRef<{ section: EditorSection; side: Side } | null>(null);
  useEffect(() => {
    const was = last.current;
    last.current = { section, side };
    if (!isPhoneWidth()) return;
    const wanted = SIDE_OF[section];
    if (was?.section !== section) {
      if (wanted) setSide(wanted);
      return;
    }
    if (was.side !== side && wanted !== side) onSection(SECTION_OF[side]);
  }, [section, side, setSide, onSection]);
}
