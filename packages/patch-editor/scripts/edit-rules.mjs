// Edit's own rules, beside the app's `scripts/lint/rules.mjs`, which checks Edit's colours, type, spacing, lines,
// layers and motion. Run with `npm run lint:rules` in this package. Every rule runs and every failure is reported.
//
//   - raw-control: a `<button>`, `<input>`, `<select>`, `<textarea>` or `<a>` is written only in
//     `src/ui/controls`, Edit's controls. Everything else draws one of them (TL-5).
//   - hover-without-a-mouse: a `:hover` rule sits inside `@media (hover: hover)`, so a tap on a phone does
//     not leave a key lit (ST-5).
//   - raw-edge: a box-shadow edge is `var(--line)` or `var(--line-strong)` wide, never a number (GE-4).
//   - raw-size: a height, width or flex basis writes no length or number of its own, in the style sheet and in
//     inline styles. It is a token from src/design-system/design-system.css, which also holds Edit's own sizes
//     (GE-10, TO-1).
//   - raw-offset: inset, top to left, scroll margins and paddings and outline-offset write no length of their
//     own, in the style sheet and in inline styles (SP-1).
//   - size-outside-the-tokens: styles.css defines no custom property that holds a length, so a size cannot hide
//     in a one-off variable. Sizes live with the app's tokens (GE-10, TO-1).
//   - half-step-inline: `--space-half` is the space inside one small thing (D69), which a class in styles.css
//     draws. An inline style lays out rows, so it never takes the half step (SP-2).
//   - hover-text: no `title` on an element and no SVG `<title>`. A finger cannot hover, so what a person needs
//     is in the words they see or in the accessible name (CM-8).
//   - cut-off-text: no `text-overflow: ellipsis` and no line clamp. A name that does not fit wraps, so it is
//     never cut off with its full text out of reach (DA-14).
//   - voice: the words Edit shows keep the style rules of docs/design-system/voice.md that a machine can check,
//     read from docs/design-system/voice-rules.json, with the words voice.md lets Edit say (BR-5, BR-6).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const PACKAGE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = path.join(PACKAGE, 'src');
const CONTROLS = path.join(SOURCE, 'ui', 'controls');
const GENERATED = path.join(SOURCE, 'engine', 'generated');
const STYLES = path.join(SOURCE, 'styles.css');
const VOICE_RULES = path.join(PACKAGE, '..', '..', 'docs', 'design-system', 'voice-rules.json');

const RAW_CONTROL = /<(button|input|textarea|select|a)(?=[\s>/]|$)/gm;
const HOVER = /:hover/g;
const HOVER_MEDIA = /@media\s*\(hover:\s*hover\)/;
// An inset edge that writes a length of its own, such as `inset 0 0 0 1px` or `inset 0 2px 0`.
const CSS_EDGE = /box-shadow\s*:[^;}]*\binset(?:\s+[^\s;}]+)*?\s+\d*\.?\d+px/g;
const INLINE_EDGE = /boxShadow\s*:\s*['"`][^'"`]*\binset(?:\s+[^\s'"`]+)*?\s+\d*\.?\d+px/g;

// A length written out, outside a `var(--token)`: any number with a unit but a bare zero.
// A length written out: any number with a unit, a screen unit such as vh too, but a bare zero.
const LITERAL = /(?<![\w.#-])(?!0(?:px|em|rem|d?vh|vw)?(?![\d.]))\d*\.?\d+(?:px|em|rem|[dsl]?v[hw]|vmin|vmax)\b/;
// A length with a minus sign of its own is as raw as one without: -15px is a value, var(--line) is not.
const NEGATIVE = /(^|[\s(,'"`])-(?=\.?\d)/g;
const CSS_SIZE = /(?:^|[;{\s])((?:min-|max-)?(?:height|width)|flex-basis)\s*:\s*([^;}]+)/g;
const CSS_OFFSET =
  /(?:^|[;{\s])(inset(?:-[a-z-]+)?|top|right|bottom|left|scroll-margin(?:-[a-z-]+)?|scroll-padding(?:-[a-z-]+)?|outline-offset)\s*:\s*([^;}]+)/g;
const CSS_CUSTOM_LENGTH = /(?:^|[;{\s])(--[\w-]+)\s*:\s*([^;}]+)/g;
const CSS_CUT_OFF = /text-overflow\s*:\s*ellipsis|line-clamp\s*:/g;

const INLINE_STYLE_START = /\bstyle=\{\{/g;
const INLINE_CHECKS = [
  { rule: 'raw-size', pattern: /(?<![\w.])((?:min|max)?(?:[Hh]eight|[Ww]idth)|flexBasis)\s*:\s*([^,}\n]+)/g },
  {
    rule: 'raw-offset',
    pattern: /(?<![\w.])(inset\w*|top|right|bottom|left|scroll(?:Margin|Padding)\w*|outlineOffset)\s*:\s*([^,}\n]+)/g,
  },
];
const INLINE_NUMBER = /(?<![\w.$#-])\d*\.?\d+(?![\w.%])/g;
const INLINE_CUT_OFF = /\b(textOverflow\s*:\s*['"]ellipsis|WebkitLineClamp|lineClamp)\b/g;
const INLINE_HALF_STEP = /var\(--space-half\)/g;

const problems = [];
const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const report = (file, text, index, rule, message) =>
  problems.push({ where: `${path.relative(PACKAGE, file)}:${lineOf(text, index)}`, rule, message });

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

// Comments blanked to spaces, so a word or a brace in one is not read as CSS and every index still holds.
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

const isRawLength = (value) => LITERAL.test(value.replace(/var\(--[\w-]+\)/g, '').replace(NEGATIVE, '$1'));

function checkStyleRules(text) {
  const inside = hoverBlocks(text);
  for (const match of text.matchAll(HOVER)) {
    if (!inside[match.index]) report(STYLES, text, match.index, 'hover-without-a-mouse', 'put this rule inside @media (hover: hover)');
  }
  for (const match of text.matchAll(CSS_EDGE)) {
    report(STYLES, text, match.index, 'raw-edge', `${match[0]}: use var(--line) or var(--line-strong)`);
  }
  for (const match of text.matchAll(CSS_CUT_OFF)) {
    report(STYLES, text, match.index, 'cut-off-text', `${match[0]}: let the text wrap, so all of it shows`);
  }
}

function checkStyleGeometry(text) {
  const checks = [
    [CSS_SIZE, 'raw-size', 'use a size token from the design system'],
    [CSS_OFFSET, 'raw-offset', 'use a spacing or line token'],
  ];
  for (const [pattern, rule, help] of checks) {
    for (const match of text.matchAll(pattern)) {
      if (isRawLength(match[2])) report(STYLES, text, match.index, rule, `${match[1]}: ${match[2].trim()}: ${help}`);
    }
  }
  for (const match of text.matchAll(CSS_CUSTOM_LENGTH)) {
    if (isRawLength(match[2])) {
      report(STYLES, text, match.index, 'size-outside-the-tokens', `${match[1]}: sizes live in src/design-system/design-system.css`);
    }
  }
}

function checkStyles() {
  const text = withoutComments(fs.readFileSync(STYLES, 'utf8'));
  checkStyleRules(text);
  checkStyleGeometry(text);
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

// A value is raw when it writes a length or a number of its own, outside a `var(--token)`.
function isRawInline(value) {
  const bare = value.replace(/var\(--[\w-]+\)/g, '').replace(NEGATIVE, '$1');
  if (LITERAL.test(bare)) return true;
  return [...bare.matchAll(INLINE_NUMBER)].some(([number]) => Number(number) !== 0);
}

function checkInlineStyles(file, text) {
  for (const { at, body } of inlineStyles(text)) {
    for (const { rule, pattern } of INLINE_CHECKS) {
      for (const match of body.matchAll(pattern)) {
        if (isRawInline(match[2])) report(file, text, at + match.index, rule, `${match[1]}: ${match[2].trim()}: use a token`);
      }
    }
    for (const match of body.matchAll(INLINE_HALF_STEP)) {
      report(file, text, at + match.index, 'half-step-inline', 'the half step is inside one small thing: give it a class');
    }
    for (const match of body.matchAll(INLINE_CUT_OFF)) {
      report(file, text, at + match.index, 'cut-off-text', `${match[1]}: let the text wrap, so all of it shows`);
    }
  }
}

// ------------------------------------------------------------------ words and hover text, read from the syntax

const voice = JSON.parse(fs.readFileSync(VOICE_RULES, 'utf8'));
const VOICE = voice.rules.map(({ pattern, flags, help }) => [new RegExp(pattern, flags), help]);
const ALLOWED_IN_EDIT = new RegExp(`(?<![\\w-])(${voice.edit.allowed.join('|')})(?![\\w-])`, 'gi');

// The props whose string is shown to a person, as `scripts/lint/rules.mjs` reads them, and the ones that never are.
const TEXT_PROPS = new Set(['label', 'text', 'title', 'note', 'hint', 'intro', 'placeholder', 'aria-label', 'description', 'detail']);
const NOT_WORDS = new Set(['className', 'type', 'key', 'role', 'id', 'href', 'inputMode', 'autoComplete', 'd', 'viewBox']);
const STRING_KINDS = ['isStringLiteral', 'isNoSubstitutionTemplateLiteral', 'isTemplateHead', 'isTemplateMiddle', 'isTemplateTail'];

const attributeOf = (node) => {
  for (let at = node.parent; at; at = at.parent) if (ts.isJsxAttribute(at)) return at.name.getText();
  return null;
};

// A label of one word, such as 'Palettes' in a record of names: a capital, then small letters.
const LABEL_WORD = /^[A-Z][a-z]+$/;

// Text in JSX, a text prop, a phrase (a string with a space in it), or a label of one word.
function isShown(node, attribute) {
  if (ts.isJsxText(node)) return node.text.trim() !== '';
  if (!STRING_KINDS.some((kind) => ts[kind](node))) return false;
  return /\s\S/.test(node.text) || LABEL_WORD.test(node.text) || TEXT_PROPS.has(attribute);
}

const isIntrinsic = (tag) => /^[a-z]/.test(tag.getText());

function checkHoverText(file, text, node, source) {
  if (ts.isJsxAttribute(node) && node.name.getText() === 'title') {
    const element = node.parent.parent;
    if ((ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element)) && isIntrinsic(element.tagName)) {
      report(file, text, node.getStart(source), 'hover-text', `title on <${element.tagName.getText()}>: show the words, or name the control`);
    }
  }
  if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText() === 'title') {
    report(file, text, node.getStart(source), 'hover-text', '<title>: a tooltip a finger cannot reach; use <desc> or the accessible name');
  }
}

function checkWords(file, text, node, source) {
  const words = node.text.replace(ALLOWED_IN_EDIT, '');
  for (const [pattern, help] of VOICE) {
    const match = pattern.exec(words);
    if (match) report(file, text, node.getStart(source), 'voice', `"${match[0].trim()}": ${help}`);
  }
}

function checkSyntax(file, text) {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    checkHoverText(file, text, node, source);
    const attribute = attributeOf(node);
    if (NOT_WORDS.has(attribute)) return;
    if (isShown(node, attribute)) checkWords(file, text, node, source);
    ts.forEachChild(node, visit);
  };
  visit(source);
}

function checkSource(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.tsx') && !isInside(file, CONTROLS)) {
    for (const match of text.matchAll(RAW_CONTROL)) {
      report(file, text, match.index, 'raw-control', `<${match[1]}>: use a control from src/ui/controls`);
    }
  }
  if (file.endsWith('.tsx')) {
    for (const match of text.matchAll(INLINE_EDGE)) {
      report(file, text, match.index, 'raw-edge', 'use var(--line) or var(--line-strong) for the edge');
    }
    checkInlineStyles(file, text);
  }
  checkSyntax(file, text);
}

checkStyles();
const isChecked = (file) => /\.tsx?$/.test(file) && !/\.(test|d)\.ts$/.test(file);
for (const file of walk(SOURCE).filter(isChecked)) checkSource(file);

for (const { where, rule, message } of problems) console.log(`${where}  ${rule}  ${message}`);
const byRule = {};
for (const { rule } of problems) byRule[rule] = (byRule[rule] ?? 0) + 1;
console.log(problems.length ? `\n${problems.length} problems in Edit's rules: ${JSON.stringify(byRule)}` : 'edit rules: no problems');
process.exit(problems.length ? 1 : 0);
