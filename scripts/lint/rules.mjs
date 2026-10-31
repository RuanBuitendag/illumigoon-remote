// What the other linters cannot express. Run with `npm run lint:rules`.
//
//   - No file sits outside the layers. Only src/main.tsx may.
//   - The domain holds no look: no CSS, no class names, no inline styles, no raw HTML controls.
//   - Composites build on the design system: no raw controls, no raw colours, no inline look.
//   - Only the design system holds raw colours, in TypeScript and in CSS.
//   - The two CSS files stay with their layer.

import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'src';
const LAYERS = ['design-system', 'composites', 'domain'];
const GENERATED = /^src\/domain\/looks\/engine\//;

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

const problems = [];

const report = (file, line, rule, text) => problems.push({ file, line, rule, text });
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function runChecks(file, checks) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [rule, pattern, help] of checks) {
    for (const match of text.matchAll(pattern)) report(file, lineOf(text, match.index), rule, `${match[0].trim()}: ${help}`);
  }
}

function checkCss(file, layer) {
  if (layer === 'domain') report(file, 1, 'look-in-domain', 'the domain holds no CSS: move it to a composite');
  if (layer === 'composites') runChecks(file, [CSS_RAW_COLOUR]);
}

for (const file of walk(SOURCE)) {
  const layer = layerOf(file);
  if (GENERATED.test(file)) continue;
  if (file === `${SOURCE}/main.tsx`) runChecks(file, CODE_CHECKS.domain);
  else if (!layer) report(file, 1, 'outside-the-layers', `move it into ${LAYERS.join(', ')}`);
  else if (file.endsWith('.css')) checkCss(file, layer);
  else if (/\.tsx?$/.test(file)) runChecks(file, CODE_CHECKS[layer]);
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
