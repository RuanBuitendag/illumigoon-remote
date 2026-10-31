export type Colour = { r: number; g: number; b: number };

export type Hsv = { h: number; s: number; v: number };

const clampByte = (value: number) => Math.round(Math.min(255, Math.max(0, value)));

export const colourToHex = ({ r, g, b }: Colour) =>
  `#${[r, g, b].map((channel) => clampByte(channel).toString(16).padStart(2, '0')).join('')}`;

export function hexToColour(hex: string): Colour {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return { r: channel(1), g: channel(3), b: channel(5) };
}

export function hsvToColour({ h, s, v }: Hsv): Colour {
  const channel = (shift: number) => {
    const position = (shift + h / 60) % 6;
    return clampByte(255 * v * (1 - s * Math.max(0, Math.min(position, 4 - position, 1))));
  };
  return { r: channel(5), g: channel(3), b: channel(1) };
}

function hueOf({ r: red, g: green, b: blue }: Colour, largest: number, spread: number) {
  if (spread === 0) return 0;
  if (largest === red) return (((green - blue) / spread + 6) % 6) * 60;
  if (largest === green) return ((blue - red) / spread + 2) * 60;
  return ((red - green) / spread + 4) * 60;
}

export function colourToHsv({ r, g, b }: Colour): Hsv {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const largest = Math.max(red, green, blue);
  const spread = largest - Math.min(red, green, blue);
  return {
    h: hueOf({ r: red, g: green, b: blue }, largest, spread),
    s: largest === 0 ? 0 : spread / largest,
    v: largest,
  };
}

// The colour of a black body at this temperature, in kelvin. Tanner Helland's fit.
export function warmthToColour(kelvin: number): Colour {
  const k = kelvin / 100;
  const red = k <= 66 ? 255 : 329.7 * (k - 60) ** -0.1332;
  const green = k <= 66 ? 99.47 * Math.log(k) - 161.12 : 288.12 * (k - 60) ** -0.0755;
  const blue = k <= 19 ? 0 : k >= 66 ? 255 : 138.52 * Math.log(k - 10) - 305.04;
  return { r: clampByte(red), g: clampByte(green), b: clampByte(blue) };
}

export const HUE_GRADIENT = 'linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
export const BLACK_HEX = '#000000';

export const gradientOf = (colours: Colour[]) => `linear-gradient(90deg, ${colours.map(colourToHex).join(', ')})`;
