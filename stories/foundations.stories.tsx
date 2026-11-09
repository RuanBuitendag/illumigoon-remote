import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import TOKEN_SHEET from '../src/design-system/design-system.css?raw';

// The tokens of the design system, read in order from the first `:root` block of design-system.css, with the
// comment over each group. The values are read from the page, so the light theme, more contrast and the reader's
// text size show here as they show in the app.

type Token = { name: string; source: string; note: string };

function readTokens(): Token[] {
  const block = TOKEN_SHEET.slice(TOKEN_SHEET.indexOf(':root {') + 7, TOKEN_SHEET.indexOf('\n}'));
  const tokens: Token[] = [];
  let note = '';
  for (const part of block.split(/(\/\*[\s\S]*?\*\/)/)) {
    if (part.startsWith('/*')) {
      note = part.slice(2, -2).replace(/\s+/g, ' ').trim();
      continue;
    }
    for (const [, name, source] of part.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
      tokens.push({ name: name ?? '', source: (source ?? '').trim(), note });
      note = '';
    }
  }
  return tokens;
}

const TOKENS = readTokens();

const KINDS: [string, (token: Token) => boolean][] = [
  ['Colour', ({ name, source }) => /^(#|rgba?\(|var\(--text)/.test(source) || /^--(fill|focus|ink-rgb)$/.test(name)],
  ['Type', ({ name }) => /^--(type|size|weight|sans|mono|tracking)/.test(name)],
  ['Spacing', ({ name }) => /^--(space|section|gutter|edge)/.test(name)],
  ['Motion', ({ name }) => /^--(ease|duration|push$)/.test(name)],
  ['Layers', ({ name }) => /^--layer/.test(name)],
  ['Shadows and opacity', ({ name }) => /shadow|opacity/.test(name)],
];

const kindOf = (token: Token) => KINDS.find(([, test]) => test(token))?.[0] ?? 'Sizes and lines';

function useLiveValue(name: string) {
  const [value, setValue] = useState('');
  useEffect(() => setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim()), [name]);
  return value;
}

const PAGE: CSSProperties = {
  padding: 'var(--space-5)',
  background: 'var(--background)',
  color: 'var(--text-1)',
  font: 'var(--type-body)',
  minHeight: '100vh',
};
const ROW: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(180px, 1fr) minmax(160px, 1.4fr) minmax(200px, 2fr)',
  gap: 'var(--space-4)',
  alignItems: 'center',
  padding: 'var(--space-3) 0',
  borderBottom: 'var(--line) solid var(--track)',
};
const NAME: CSSProperties = { font: 'var(--type-value)', color: 'var(--text-1)' };
const QUIET: CSSProperties = { font: 'var(--type-small)', color: 'var(--text-4)' };

function Sample({ kind, token }: { kind: string; token: Token }) {
  const { name } = token;
  const box: CSSProperties = { border: 'var(--line) solid var(--track)' };
  if (kind === 'Colour') {
    // --ink-rgb holds three numbers, for colours that add their own alpha.
    const colour = name === '--ink-rgb' ? `rgb(var(${name}))` : `var(${name})`;
    return <div style={{ ...box, height: 'var(--row)', background: colour }} />;
  }
  if (/^--type/.test(name)) return <div style={{ font: `var(${name})` }}>Lounge, 60 %</div>;
  if (/^--(size)/.test(name)) return <div style={{ fontSize: `var(${name})` }}>Lounge</div>;
  if (/^--(sans|mono)/.test(name)) return <div style={{ fontFamily: `var(${name})` }}>Lounge 0123456789</div>;
  if (/^--weight/.test(name)) return <div style={{ fontWeight: `var(${name})` }}>Lounge</div>;
  if (kind === 'Spacing' || /px|rem|calc/.test(token.source)) {
    return <div style={{ height: 'var(--space-2)', width: `var(${name})`, maxWidth: '100%', background: 'var(--text-3)' }} />;
  }
  if (kind === 'Shadows and opacity' && /shadow/.test(name)) {
    return <div style={{ height: 'var(--row)', background: 'var(--background)', boxShadow: `var(${name})` }} />;
  }
  if (/opacity/.test(name)) return <div style={{ height: 'var(--row)', background: 'var(--text-1)', opacity: `var(${name})` }} />;
  return null;
}

function TokenRow({ kind, token }: { kind: string; token: Token }) {
  const live = useLiveValue(token.name);
  return (
    <div style={ROW}>
      <div>
        <div style={NAME}>{token.name}</div>
        <div style={QUIET}>{live || token.source}</div>
      </div>
      <Sample kind={kind} token={token} />
      <div style={QUIET}>{token.note}</div>
    </div>
  );
}

function TokenTable({ kind }: { kind: string }): ReactNode {
  const tokens = TOKENS.filter((token) => kindOf(token) === kind);
  return (
    <div style={PAGE}>
      <h1 style={{ font: 'var(--type-heading)', margin: '0 0 var(--space-5)' }}>
        {kind}, {tokens.length} tokens
      </h1>
      {tokens.map((token) => (
        <TokenRow key={token.name} kind={kind} token={token} />
      ))}
    </div>
  );
}

export default { title: 'Foundations/Tokens', parameters: { layout: 'fullscreen' } } satisfies Meta;

type Story = StoryObj;
const table = (kind: string): Story => ({ name: kind, render: () => <TokenTable kind={kind} /> });

export const Colour = table('Colour');
export const Type = table('Type');
export const Spacing = table('Spacing');
export const SizesAndLines = table('Sizes and lines');
export const ShadowsAndOpacity = table('Shadows and opacity');
export const Motion = table('Motion');
export const Layers = table('Layers');
