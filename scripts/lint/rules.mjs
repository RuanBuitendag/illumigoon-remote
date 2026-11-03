// What the other linters cannot express. Run with `npm run lint:rules`.
//
//   - No file sits outside the layers. Only src/main.tsx may.
//   - The domain holds no look: no CSS, no class names, no inline styles, no raw HTML controls.
//   - Composites build on the design system: no raw controls, no raw colours, no inline look.
//   - Only the design system holds raw colours, in TypeScript and in CSS.
//   - The two CSS files stay with their layer.
//   - The editor's style sheet takes every colour from the tokens.
//   - Type comes only from the tokens, in composites, the design system and the editor.
//   - Spacing, row heights and corners come only from the tokens in composites.
//   - Layers, opacity, motion and line widths come only from the tokens in composites and the design system.
//   - Every media query width in the app and the editor is the --wide token.

import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'src';
const LAYERS = ['design-system', 'composites', 'domain'];
const GENERATED = /^src\/domain\/looks\/engine\//;
const EDITOR_STYLES = 'packages/patch-editor/src/styles.css';
const EDITOR_SOURCE = 'packages/patch-editor/src';

const walk = (folder) =>
  fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.posix.join(folder, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });

const layerOf = (file) => LAYERS.find((layer) => file.startsWith(`${SOURCE}/${layer}/`));

const RAW_CONTROL = ['raw-control', /<(button|input|textarea|select|a)[\s>]/g, 'use a control from the design system'];
const RAW_COLOUR = [
  'raw-colour',
  /(?<![\w&])#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g,
  'colours belong in the design system',
];
const INLINE_LOOK = [
  'inline-look',
  /style=\{\{[^}]*\b(fontSize|color|background|backgroundColor|border|borderRadius|boxShadow|fontFamily)\s*:/g,
  'give the design system a component or a prop for this',
];
const CLASS_NAME = ['look-in-domain', /\bclassName=/g, 'the domain holds no look: use a composite'];
const STYLE_PROP = ['look-in-domain', /\bstyle=\{/g, 'the domain holds no look: use a composite'];

const CODE_CHECKS = {
  'design-system': [],
  composites: [RAW_CONTROL, RAW_COLOUR, INLINE_LOOK],
  domain: [RAW_CONTROL, RAW_COLOUR, CLASS_NAME, STYLE_PROP],
};

const CSS_RAW_COLOUR = [
  'raw-colour',
  /(?<![\w-])#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(/g,
  'use a token from design-system.css',
];

const LITERAL = /(?<![\w.#-])(?!0(?:px|em|rem)?(?![\d.]))\d*\.?\d+(?:px|em|rem)\b/;
const BARE_WEIGHT = /(?<![\w.-])[1-9]00\b/;
const TYPE_PROPERTY = /(?:^|[;{\s])(font|font-size|font-weight|line-height|letter-spacing)\s*:\s*([^;}]+)/g;
const SPACE_PROPERTY =
  /(?:^|[;{\s])(gap|row-gap|column-gap|margin(?:-\w+)?|padding(?:-\w+)?|min-height|border-radius)\s*:\s*([^;}]+)/g;
const BORDER_PROPERTY = /(?:^|[;{\s])(border(?:-top|-right|-bottom|-left)?(?:-width)?|outline(?:-width)?)\s*:\s*([^;}]+)/g;
const LAYER_PROPERTY = /(?:^|[;{\s])(z-index|opacity)\s*:\s*([^;}]+)/g;
const MOTION_PROPERTY = /(?:^|[;{\s])((?:transition|animation)(?:-duration|-delay|-timing-function)?)\s*:\s*([^;}]+)/g;
const RAW_NUMBER = /^(?!0$|1$)\d*\.?\d+$/;
const RAW_MOTION = /(?<![\w.-])(?!0m?s\b)\d*\.?\d+m?s\b|cubic-bezier\(/;
const MEDIA_WIDTH = /\((min|max)-width:\s*(\d+)px\)/g;
const INLINE_TYPE = /\b(font|fontSize|fontWeight|letterSpacing|lineHeight)\s*:\s*['"]?\.?\d[^,}\n]*/g;
const TOKENS_END = /^\* \{/m;

const problems = [];

const report = (file, line, rule, text) => problems.push({ file, line, rule, text });
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function runChecks(file, checks) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [rule, pattern, help] of checks) {
    for (const match of text.matchAll(pattern)) report(file, lineOf(text, match.index), rule, `${match[0].trim()}: ${help}`);
  }
}

// Reports a declaration that writes its own size. `from` skips the tokens at the top of the design system.
function checkTokens(file, pattern, rule, from = 0) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.slice(from).matchAll(pattern)) {
    const [, property, value] = match;
    if (LITERAL.test(value) || BARE_WEIGHT.test(value)) {
      report(file, lineOf(text, from + match.index), rule, `${property}: ${value.trim()}: use a token from design-system.css`);
    }
  }
}

// Reports a declaration whose value `isRaw` says the tokens should hold.
function checkValues(file, pattern, rule, isRaw, from = 0) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.slice(from).matchAll(pattern)) {
    const [, property, value] = match;
    if (isRaw(value.trim())) {
      report(file, lineOf(text, from + match.index), rule, `${property}: ${value.trim()}: use a token from design-system.css`);
    }
  }
}

function checkGeometry(file, from = 0) {
  checkValues(file, BORDER_PROPERTY, 'raw-line', (value) => LITERAL.test(value), from);
  checkValues(file, LAYER_PROPERTY, 'raw-layer', (value) => RAW_NUMBER.test(value), from);
  checkValues(file, MOTION_PROPERTY, 'raw-motion', (value) => RAW_MOTION.test(value), from);
}

// A media query cannot read a custom property, so each width must be --wide, or one pixel under it.
const WIDE = Number(/--wide:\s*(\d+)px/.exec(fs.readFileSync(`${SOURCE}/design-system/design-system.css`, 'utf8'))[1]);
function checkMediaWidths(file) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(MEDIA_WIDTH)) {
    const [query, side, width] = match;
    if (Number(width) !== (side === 'min' ? WIDE : WIDE - 1)) {
      report(file, lineOf(text, match.index), 'raw-width', `${query}: the laptop width is --wide, ${WIDE}px`);
    }
  }
}

function checkInlineType(file) {
  runChecks(file, [['raw-type', INLINE_TYPE, 'use a type token from design-system.css']]);
}

function checkCss(file, layer) {
  if (layer === 'domain') report(file, 1, 'look-in-domain', 'the domain holds no CSS: move it to a composite');
  if (layer === 'composites') {
    runChecks(file, [CSS_RAW_COLOUR]);
    checkTokens(file, TYPE_PROPERTY, 'raw-type');
    checkTokens(file, SPACE_PROPERTY, 'raw-spacing');
    checkGeometry(file);
  }
  if (layer === 'design-system') {
    const tokensEnd = fs.readFileSync(file, 'utf8').search(TOKENS_END);
    checkTokens(file, TYPE_PROPERTY, 'raw-type', tokensEnd);
    checkGeometry(file, tokensEnd);
  }
}

for (const file of walk(SOURCE)) {
  const layer = layerOf(file);
  if (GENERATED.test(file)) continue;
  if (file === `${SOURCE}/main.tsx`) runChecks(file, CODE_CHECKS.domain);
  else if (!layer) report(file, 1, 'outside-the-layers', `move it into ${LAYERS.join(', ')}`);
  else if (file.endsWith('.css')) checkCss(file, layer);
  else if (/\.tsx?$/.test(file)) runChecks(file, CODE_CHECKS[layer]);
  if (layer && /\.(css|tsx?)$/.test(file)) checkMediaWidths(file);
}

runChecks(EDITOR_STYLES, [CSS_RAW_COLOUR]);
checkTokens(EDITOR_STYLES, TYPE_PROPERTY, 'raw-type');
for (const file of walk(EDITOR_SOURCE)) {
  if (file.endsWith('.tsx')) checkInlineType(file);
  if (/\.(css|tsx?)$/.test(file) && !file.includes('/generated/')) checkMediaWidths(file);
}

for (const layer of ['design-system', 'composites']) {
  const door = `${SOURCE}/${layer}/index.ts`;
  if (!fs.existsSync(door)) report(door, 1, 'missing-door', 'each UI layer has one index file');
}

for (const { file, line, rule, text } of problems) console.log(`${file}:${line}  ${rule}  ${text}`);
const byRule = {};
for (const { rule } of problems) byRule[rule] = (byRule[rule] ?? 0) + 1;
console.log(problems.length ? `\n${problems.length} problems: ${JSON.stringify(byRule)}` : 'lint:rules: no problems');
process.exit(problems.length ? 1 : 0);
