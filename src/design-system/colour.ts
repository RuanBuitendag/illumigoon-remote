export type Colour = { r: number; g: number; b: number };

const clampByte = (value: number) => Math.round(Math.min(255, Math.max(0, value)));

export const colourToHex = ({ r, g, b }: Colour) =>
  `#${[r, g, b].map((channel) => clampByte(channel).toString(16).padStart(2, '0')).join('')}`;

export function hexToColour(hex: string): Colour {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return { r: channel(1), g: channel(3), b: channel(5) };
}

// The colour of a black body at this temperature, in kelvin. Tanner Helland's fit.
export function warmthToColour(kelvin: number): Colour {
  const k = kelvin / 100;
  const red = k <= 66 ? 255 : 329.7 * (k - 60) ** -0.1332;
  const green = k <= 66 ? 99.47 * Math.log(k) - 161.12 : 288.12 * (k - 60) ** -0.0755;
  const blue = k <= 19 ? 0 : k >= 66 ? 255 : 138.52 * Math.log(k - 10) - 305.04;
  return { r: clampByte(red), g: clampByte(green), b: clampByte(blue) };
}

export const BLACK_HEX = '#000000';

export const gradientOf = (colours: Colour[]) => `linear-gradient(90deg, ${colours.map(colourToHex).join(', ')})`;
