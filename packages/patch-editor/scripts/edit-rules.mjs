// Edit's own rules, beside the app's `scripts/lint/rules.mjs`, which checks Edit's colours, type and spacing.
// Run with `npm run lint:rules` in this package.
//
//   - raw-control: a `<button>`, `<input>`, `<select>`, `<textarea>` or `<a>` is written only in
//     `src/ui/controls`, Edit's controls. Everything else draws one of them (TL-5).
//   - hover-without-a-mouse: a `:hover` rule sits inside `@media (hover: hover)`, so a tap on a phone does
//     not leave a key lit (ST-5).
//   - raw-edge: a box-shadow edge is `var(--line)` or `var(--line-strong)` wide, never a number (GE-4).
//   - raw-size: a height or width that is the size of a token is written as that token (GE-10).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = path.join(PACKAGE, 'src');
const CONTROLS = path.join(SOURCE, 'ui', 'controls');
const GENERATED = path.join(SOURCE, 'engine', 'generated');
const STYLES = path.join(SOURCE, 'styles.css');
const TOKENS = path.join(PACKAGE, '..', '..', 'src', 'design-system', 'design-system.css');

const RAW_CONTROL = /<(button|input|textarea|select|a)(?=[\s>/]|$)/gm;
const HOVER = /:hover/g;
const HOVER_MEDIA = /@media\s*\(hover:\s*hover\)/;
// An inset edge that writes a length of its own, such as `inset 0 0 0 1px` or `inset 0 2px 0`.
const CSS_EDGE = /box-shadow\s*:[^;}]*\binset(?:\s+[^\s;}]+)*?\s+\d*\.?\d+px/g;
const INLINE_EDGE = /boxShadow\s*:\s*['"`][^'"`]*\binset(?:\s+[^\s'"`]+)*?\s+\d*\.?\d+px/g;
const CSS_SIZE = /(?:^|[;{\s])((?:min-|max-)?(?:height|width))\s*:\s*(\d+)px\b/g;
// The tokens a size can be, read from design-system.css so a changed token moves the rule with it.
const SIZE_TOKENS = ['row', 'row-tall', 'pointer-target', 'line', 'line-strong'];

const problems = [];
const report = (file, text, index, rule, message) =>
  problems.push(`${path.relative(PACKAGE, file)}:${text.slice(0, index).split('\n').length}  ${rule}  ${message}`);

const walk = (folder) =>
  fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(folder, entry.name);
    if (entryPath === GENERATED) return [];
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });

const isInside = (file, folder) => !path.relative(folder, file).startsWith('..');

// The brace depth at which each `@media (hover: hover)` block opens, so a rule can tell whether it is inside one.
function hoverBlocks(text) {
  const open = [];
  const inside = new Array(text.length).fill(false);
  let depth = 0;
  for (let at = 0; at < text.length; at += 1) {
    if (text[at] === '{') {
      const head = text.slice(text.lastIndexOf('}', at) + 1, at);
      if (HOVER_MEDIA.test(head)) open.push(depth);
      depth += 1;
    } else if (text[at] === '}') {
      depth -= 1;
      if (open.at(-1) === depth) open.pop();
    }
    inside[at] = open.length > 0;
  }
  return inside;
}

function tokenSizes() {
  const text = fs.readFileSync(TOKENS, 'utf8');
  return new Map(
    SIZE_TOKENS.map((name) => [new RegExp(String.raw`--${name}:\s*(\d+)px`).exec(text)?.[1], `--${name}`]).filter(([px]) => px),
  );
}

// Comments blanked to spaces, so a word or a brace in one is not read as CSS and every index still holds.
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

function checkStyles() {
  const text = withoutComments(fs.readFileSync(STYLES, 'utf8'));
  const inside = hoverBlocks(text);
  for (const match of text.matchAll(HOVER)) {
    if (!inside[match.index]) report(STYLES, text, match.index, 'hover-without-a-mouse', 'put this rule inside @media (hover: hover)');
  }
  for (const match of text.matchAll(CSS_EDGE)) {
    report(STYLES, text, match.index, 'raw-edge', `${match[0]}: use var(--line) or var(--line-strong)`);
  }
  const sizes = tokenSizes();
  for (const match of text.matchAll(CSS_SIZE)) {
    const token = sizes.get(match[2]);
    if (token) report(STYLES, text, match.index, 'raw-size', `${match[1]}: ${match[2]}px is var(${token})`);
  }
}

function checkSource(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (!isInside(file, CONTROLS)) {
    for (const match of text.matchAll(RAW_CONTROL)) {
      report(file, text, match.index, 'raw-control', `<${match[1]}>: use a control from src/ui/controls`);
    }
  }
  for (const match of text.matchAll(INLINE_EDGE)) {
    report(file, text, match.index, 'raw-edge', 'use var(--line) or var(--line-strong) for the edge');
  }
}

checkStyles();
for (const file of walk(SOURCE).filter((file) => file.endsWith('.tsx'))) checkSource(file);

for (const problem of problems) console.log(problem);
console.log(problems.length ? `\n${problems.length} problems in Edit's rules` : 'edit rules: no problems');
process.exit(problems.length ? 1 : 0);
