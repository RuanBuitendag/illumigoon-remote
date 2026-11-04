// What the other linters cannot express. Run with `npm run lint:rules`.
//
//   - No file sits outside the layers. Only src/main.tsx may.
//   - The domain holds no look: no CSS, no class names, no inline styles, no raw HTML controls.
//   - Composites build on the design system: no raw controls, no raw colours, no inline look.
//   - Only the design system holds raw colours, in TypeScript and in CSS.
//   - The two CSS files stay with their layer.
//   - The editor's style sheet takes every colour from the tokens.
//   - Type comes only from the tokens, in composites, the design system and the editor.
//   - Spacing, row heights and corners come only from the tokens in composites, the design system and the editor.
//   - Heights, widths, box-shadow edges and offsets (inset, top to left, scroll margins and paddings,
//     outline-offset) come only from the tokens in composites and the design system, in their CSS and in their
//     inline styles (GE-4, GE-10, TO-2, SP-1).
//   - Layers, opacity, motion and line widths come only from the tokens in composites, the design system and
//     the editor, in its style sheet and in the inline styles of its components.
//   - Every media query width in the app and the editor is the --wide token.
//   - The words the app shows keep the style rules of docs/design-system/voice.md that a machine can check.

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

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
const SIZE_PROPERTY = /(?:^|[;{\s])(height|width|min-width|max-width|max-height)\s*:\s*([^;}]+)/g;
const SHADOW_PROPERTY = /(?:^|[;{\s])(box-shadow)\s*:\s*([^;}]+)/g;
const OFFSET_PROPERTY =
  /(?:^|[;{\s])(inset(?:-[a-z-]+)?|top|right|bottom|left|scroll-margin(?:-[a-z-]+)?|scroll-padding(?:-[a-z-]+)?|outline-offset)\s*:\s*([^;}]+)/g;
// A length with a minus sign of its own is as raw as one without: -15px is a value, var(--line) is not.
const NEGATIVE = /(^|[\s(,'"`])-(?=\.?\d)/g;
const LAYER_PROPERTY = /(?:^|[;{\s])(z-index|opacity)\s*:\s*([^;}]+)/g;
const MOTION_PROPERTY = /(?:^|[;{\s])((?:transition|animation)(?:-duration|-delay|-timing-function)?)\s*:\s*([^;}]+)/g;
const RAW_NUMBER = /^(?!0$|1$)\d*\.?\d+$/;
const RAW_MOTION = /(?<![\w.-])(?!0m?s\b)\d*\.?\d+m?s\b|cubic-bezier\(/;
const MEDIA_WIDTH = /\((min|max)-width:\s*(\d+)px\)/g;
const INLINE_TYPE = /\b(font|fontSize|fontWeight|letterSpacing|lineHeight)\s*:\s*['"]?\.?\d[^,}\n]*/g;
const TOKENS_END = /^\* \{/m;

// The editor's inline styles, `style={{ ... }}`, checked for the same properties in their camelCase spelling.
const INLINE_STYLE_START = /\bstyle=\{\{/g;
const INLINE_GEOMETRY = [
  {
    rule: 'raw-spacing',
    pattern:
      /(?<![\w.])((?:padding|margin)(?:Top|Right|Bottom|Left|Inline|Block)?(?:Start|End)?|gap|rowGap|columnGap|minHeight|border\w*Radius)\s*:\s*([^,}\n]+)/g,
    ones: false,
  },
  { rule: 'raw-line', pattern: /(?<![\w.])(border(?:Top|Right|Bottom|Left)?(?:Width)?|outline(?:Width)?)\s*:\s*([^,}\n]+)/g, ones: false },
  { rule: 'raw-layer', pattern: /(?<![\w.])(zIndex|opacity)\s*:\s*([^,}\n]+)/g, ones: true },
  { rule: 'raw-motion', pattern: /(?<![\w.])((?:transition|animation)(?:Duration|Delay|TimingFunction)?)\s*:\s*([^,}\n]+)/g, ones: false },
];
// The same sizes and edges in the inline styles of the app's own layers. Edit has its own gate.
const INLINE_SIZE = [
  { rule: 'raw-size', pattern: /(?<![\w.])((?:min|max)?(?:[Hh]eight|[Ww]idth))\s*:\s*([^,}\n]+)/g, ones: false },
  { rule: 'raw-line', pattern: /(?<![\w.])(boxShadow)\s*:\s*([^,}\n]+)/g, ones: false },
  {
    rule: 'raw-offset',
    pattern: /(?<![\w.])(inset\w*|top|right|bottom|left|scroll(?:Margin|Padding)\w*|outlineOffset)\s*:\s*([^,}\n]+)/g,
    ones: false,
  },
];
const INLINE_NUMBER = /(?<![\w.$#-])\d*\.?\d+(?![\w.%])/g;

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
function checkValues(file, { pattern, rule, isRaw }, from = 0) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.slice(from).matchAll(pattern)) {
    const [, property, value] = match;
    if (isRaw(value.trim())) {
      report(file, lineOf(text, from + match.index), rule, `${property}: ${value.trim()}: use a token from design-system.css`);
    }
  }
}

function checkGeometry(file, from = 0) {
  checkValues(file, { pattern: BORDER_PROPERTY, rule: 'raw-line', isRaw: (value) => LITERAL.test(value) }, from);
  checkValues(file, { pattern: LAYER_PROPERTY, rule: 'raw-layer', isRaw: (value) => RAW_NUMBER.test(value) }, from);
  checkValues(file, { pattern: MOTION_PROPERTY, rule: 'raw-motion', isRaw: (value) => RAW_MOTION.test(value) }, from);
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

// The text of each `style={{ ... }}` object, found by counting braces so a nested expression stays inside.
function inlineStyles(text) {
  return [...text.matchAll(INLINE_STYLE_START)].map((match) => {
    let depth = 0;
    let end = match.index + match[0].length - 2;
    do {
      if (text[end] === '{') depth += 1;
      if (text[end] === '}') depth -= 1;
      end += 1;
    } while (depth > 0 && end < text.length);
    return { at: match.index, body: text.slice(match.index, end) };
  });
}

// A value is raw when it writes a length, a time or a number of its own, outside a `var(--token)`.
function isRawInline(value, ones) {
  const bare = value.replace(/var\(--[\w-]+\)/g, '').replace(NEGATIVE, '$1');
  if (LITERAL.test(bare) || RAW_MOTION.test(bare)) return true;
  return [...bare.matchAll(INLINE_NUMBER)].some(([number]) => Number(number) !== 0 && !(ones && Number(number) === 1));
}

function checkInlineGeometry(file, checks = INLINE_GEOMETRY) {
  const text = fs.readFileSync(file, 'utf8');
  for (const { at, body } of inlineStyles(text)) {
    for (const { rule, pattern, ones } of checks) {
      for (const match of body.matchAll(pattern)) {
        const [, property, value] = match;
        if (isRawInline(value, ones)) {
          report(file, lineOf(text, at + match.index), rule, `${property}: ${value.trim()}: use a token from design-system.css`);
        }
      }
    }
  }
}

function checkInlineType(file) {
  runChecks(file, [['raw-type', INLINE_TYPE, 'use a type token from design-system.css']]);
}

// Sizes, box-shadow edges and offsets (inset, top to left, scroll margins and paddings, outline-offset), in the
// app's layers only (SP-1, TO-2).
function checkSizes(file, from = 0) {
  checkValues(file, { pattern: SIZE_PROPERTY, rule: 'raw-size', isRaw: (value) => LITERAL.test(value) }, from);
  checkValues(file, { pattern: SHADOW_PROPERTY, rule: 'raw-line', isRaw: (value) => LITERAL.test(value) }, from);
  checkValues(file, { pattern: OFFSET_PROPERTY, rule: 'raw-offset', isRaw: (value) => LITERAL.test(value.replace(NEGATIVE, '$1')) }, from);
}

function checkCss(file, layer) {
  if (layer === 'domain') report(file, 1, 'look-in-domain', 'the domain holds no CSS: move it to a composite');
  if (layer === 'composites') {
    runChecks(file, [CSS_RAW_COLOUR]);
    checkTokens(file, TYPE_PROPERTY, 'raw-type');
    checkTokens(file, SPACE_PROPERTY, 'raw-spacing');
    checkGeometry(file);
    checkSizes(file);
  }
  if (layer === 'design-system') {
    const tokensEnd = fs.readFileSync(file, 'utf8').search(TOKENS_END);
    checkTokens(file, TYPE_PROPERTY, 'raw-type', tokensEnd);
    checkTokens(file, SPACE_PROPERTY, 'raw-spacing', tokensEnd);
    checkGeometry(file, tokensEnd);
    checkSizes(file, tokensEnd);
  }
}

for (const file of walk(SOURCE)) {
  const layer = layerOf(file);
  if (GENERATED.test(file)) continue;
  if (file === `${SOURCE}/main.tsx`) runChecks(file, CODE_CHECKS.domain);
  else if (!layer) report(file, 1, 'outside-the-layers', `move it into ${LAYERS.join(', ')}`);
  else if (file.endsWith('.css')) checkCss(file, layer);
  else if (/\.tsx?$/.test(file)) runChecks(file, CODE_CHECKS[layer]);
  if (file.endsWith('.tsx') && (layer === 'design-system' || layer === 'composites')) {
    checkInlineGeometry(file, [...INLINE_GEOMETRY, ...INLINE_SIZE]);
  }
  if (layer && /\.(css|tsx?)$/.test(file)) checkMediaWidths(file);
}

runChecks(EDITOR_STYLES, [CSS_RAW_COLOUR]);
checkTokens(EDITOR_STYLES, TYPE_PROPERTY, 'raw-type');
checkTokens(EDITOR_STYLES, SPACE_PROPERTY, 'raw-spacing');
checkGeometry(EDITOR_STYLES);
for (const file of walk(EDITOR_SOURCE)) {
  if (file.endsWith('.tsx')) {
    checkInlineType(file);
    checkInlineGeometry(file);
  }
  if (/\.(css|tsx?)$/.test(file) && !file.includes('/generated/')) checkMediaWidths(file);
}

for (const layer of ['design-system', 'composites']) {
  const door = `${SOURCE}/${layer}/index.ts`;
  if (!fs.existsSync(door)) report(door, 1, 'missing-door', 'each UI layer has one index file');
}

// The component page shows every component that the two doors export (D68, LIFE-1955). A component is an
// exported value whose name starts with a capital and a small letter, so constants such as WIDE and hooks such
// as useIsWide are not counted. The page must give it a specimen by name and import it: an import that is not
// used fails lint:types, so an imported component is drawn. The specimen's name is the export's, in quotes.
const COMPONENT_PAGE = `${SOURCE}/domain/screens/component-page`;
const COMPONENT_PAGE_FILES = [...walk(COMPONENT_PAGE), `${SOURCE}/composites/component-page-layout.tsx`];
const DOOR_EXPORTS = /^export\s*\{([^}]*)\}\s*from/gm;
const DOOR_IMPORTS = /^import\s*\{([^}]*)\}\s*from\s*'[./]*(?:design-system|composites)'/gm;

const namesIn = (text, pattern) =>
  [...text.matchAll(pattern)].flatMap(([, names]) => names.split(',').map((name) => name.trim().split(/\s+as\s+/).at(-1)));

function checkComponentPage() {
  const page = COMPONENT_PAGE_FILES.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const imported = new Set(namesIn(page, DOOR_IMPORTS));
  for (const layer of ['design-system', 'composites']) {
    const door = `${SOURCE}/${layer}/index.ts`;
    const text = fs.readFileSync(door, 'utf8');
    for (const name of namesIn(text, DOOR_EXPORTS).filter((name) => /^[A-Z][a-z]/.test(name))) {
      if (!imported.has(name) || !page.includes(`'${name}'`)) {
        report(door, 1, 'missing-from-component-page', `${name}: give it a specimen in ${COMPONENT_PAGE}`);
      }
    }
  }
}

checkComponentPage();

// The style rules of voice.md that a machine can check (BR-5, BR-6), over the words the app shows in src: the
// text in JSX, a text prop such as `label`, and every string with a space in it, which is a phrase, not a key or
// a class. Edit says palette and preset in its own store, and has its own gate.
const VOICE = [
  [/(?<![\w-])(palettes?|presets?|firmware|OTA|lamps?|bulbs?|zones?|snapshots?|intensity|patch editor)(?![\w-])/i, 'is not a word of the app (voice.md, Words)'],
  [/(?<![\w-])(successfully|please|oops)(?![\w-])/i, 'is a word voice.md asks not to write'],
  [/(?<![\w-])(color|colors|center|centered|gray|favorite)(?![\w-])/i, 'is not British spelling'],
  [/(?<![\w:])\d{1,2}(?::\d{2})?\s?[ap]\.?m\b\.?/i, 'times use the 24-hour clock, 18:00'],
  [/(?<=[A-Za-z])!(?=\s|$)/, 'the app does not exclaim'],
];
const TWELVE_HOUR_CLOCK = /hour12:\s*true|hourCycle:\s*'h1[12]'/g;
const TEXT_PROPS = new Set([
  'label',
  'text',
  'title',
  'note',
  'hint',
  'intro',
  'placeholder',
  'aria-label',
  'description',
  'detail',
  'actionLabel',
  'laterLabel',
  'backLabel',
]);
const NOT_WORDS = new Set(['className', 'type', 'key', 'role', 'id', 'href', 'inputMode', 'autoComplete']);

const attributeOf = (node) => {
  for (let at = node.parent; at; at = at.parent) if (ts.isJsxAttribute(at)) return at.name.getText();
  return null;
};

const STRING_KINDS = ['isStringLiteral', 'isNoSubstitutionTemplateLiteral', 'isTemplateHead', 'isTemplateMiddle', 'isTemplateTail'];

// Text in JSX, a text prop, or a phrase: a string with a space in it.
function isShown(node, attribute) {
  if (ts.isJsxText(node)) return node.text.trim() !== '';
  if (!STRING_KINDS.some((kind) => ts[kind](node))) return false;
  return /\s\S/.test(node.text) || TEXT_PROPS.has(attribute);
}

function shownWords(source) {
  const words = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    const attribute = attributeOf(node);
    if (NOT_WORDS.has(attribute)) return;
    if (isShown(node, attribute)) words.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return words;
}

function checkVoice(file) {
  const text = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  for (const node of shownWords(source)) {
    for (const [pattern, help] of VOICE) {
      const match = pattern.exec(node.text);
      if (match) report(file, lineOf(text, node.getStart(source)), 'voice', `"${match[0].trim()}": ${help}`);
    }
  }
  for (const match of text.matchAll(TWELVE_HOUR_CLOCK)) {
    report(file, lineOf(text, match.index), 'voice', `${match[0]}: times use the 24-hour clock`);
  }
}

for (const file of walk(SOURCE)) {
  if (/\.tsx?$/.test(file) && !file.endsWith('.test.ts') && !GENERATED.test(file)) checkVoice(file);
}

for (const { file, line, rule, text } of problems) console.log(`${file}:${line}  ${rule}  ${text}`);
const byRule = {};
for (const { rule } of problems) byRule[rule] = (byRule[rule] ?? 0) + 1;
console.log(problems.length ? `\n${problems.length} problems: ${JSON.stringify(byRule)}` : 'lint:rules: no problems');
process.exit(problems.length ? 1 : 0);
