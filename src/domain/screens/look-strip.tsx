import { useState } from 'react';
import { LedStrip } from '../../design-system';
import { useRecording, type PreviewSource } from '../looks/recordings';

type LookStripProps = {
  source: PreviewSource | null;
  shape: 'room' | 'hero' | 'tile';
  isOn?: boolean;
  brightness?: number;
};

// A recording costs time, so a strip asks for one only once it comes into view.
export function LookStrip({ source, shape, isOn, brightness }: LookStripProps) {
  const [isSeen, setSeen] = useState(false);
  const recording = useRecording(isSeen ? source : null);
  return (
    <LedStrip
      recording={recording ?? null}
      shape={shape}
      isOn={isOn}
      brightness={brightness}
      onFirstView={() => setSeen(true)}
    />
  );
}
