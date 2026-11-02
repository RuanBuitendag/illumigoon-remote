import { HexColorPicker } from 'react-colorful';

// The pad picks saturation and brightness, and the bar under it picks hue. A drag sends every step.
export function ColourPad({ colour, onChange }: { colour: string; onChange: (colour: string) => void }) {
  return <HexColorPicker className="colour-pad" color={colour} onChange={onChange} />;
}
