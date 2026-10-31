export type ColourSet = { id: string; name: string; colours: string[] };

export const STARTER_COLOUR_SETS: ColourSet[] = [
  { id: 'sunset', name: 'Sunset', colours: ['#2b1055', '#7a2048', '#c4452d', '#e8833a', '#f2c078'] },
  { id: 'ocean', name: 'Ocean', colours: ['#04203a', '#0a4361', '#12718a', '#4fa8a5'] },
  { id: 'warm', name: 'Warm', colours: ['#ff9329', '#ffa046', '#ffc178', '#ffe0b0'] },
  { id: 'neon', name: 'Neon', colours: ['#12f2a0', '#f21b7b', '#7b2bf2'] },
];
