// The UX lint's judge and report (LIFE-1891). It takes what the recorder saw in every story, adds the rules that
// need the whole story (the flow rules), and prints each finding with the way to fix it.
//
// `docs/ux-lint/known.json` lists the findings that were there when the lint started. They are work for the
// redesign, and they do not fail a run. A finding that is not on the list fails the run.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCREEN_RULES } from './screen-rules.mjs';

const KNOWN = 'docs/ux-lint/known.json';
const OUT = join(tmpdir(), 'illumigoon-regression');
// Every finding of the last run, for an agent to read.
const REPORT = join(OUT, 'ux-report.json');
// What the recorder saw in the last run, so a flow rule can be tuned without a new run of every story:
// `node scripts/ux-lint/report.mjs` judges this file again.
const TRACES = join(OUT, 'ux-traces.json');
// CLS, Cumulative Layout Shift: "good" is 0.1 or less.
const MAX_SHIFT = 0.1;
// A back key that moves less than this has not moved.
const MAX_NAV_MOVE = 4;
const REMOVES = /\b(delete|remove|reset|clear|forget|discard)\b/i;

const FLOW_RULES = {
  'back-and-forth': 'The story goes to a screen, back, and to it again. Put what it went for on the screen it came from.',
  'step-budget': 'The story takes more presses than its budget. Remove a step: a default, a shortcut, or one screen less.',
  'slow-response': 'A press took more than 200 ms to show its result. Show the result first and do the slow part after.',
  'layout-shift': 'The page jumped under the person. Keep space for what loads late.',
  'moving-nav': 'The back key is in a different place on two screens of one story (Jakob\'s law: a person reaches '
    + 'for it where it was). Keep it in one place on every screen.',
  'no-undo': 'A press that removes or resets something gave no UNDO (Shneiderman 6, Nielsen 3). Do it, then offer UNDO.',
};

const RULES = { ...SCREEN_RULES, ...FLOW_RULES };

// The screens a story went through, one entry for each change of screen.
function screensOf(presses) {
  const screens = [];
  for (const { from, to } of presses) {
    for (const screen of [from, to]) if (screen && screen !== screens.at(-1)) screens.push(screen);
  }
  return screens;
}

function backAndForth(presses) {
  const screens = screensOf(presses);
  const found = new Set();
  for (let i = 3; i < screens.length; i += 1) {
    const [a, b, c, d] = screens.slice(i - 3, i + 1);
    if (a === c && b === d && a !== b) found.add(`${a} <> ${b}`);
  }
  return [...found];
}

// Each screen where the back key stood somewhere other than on the first screen of the story that had one.
function movingNav(presses) {
  const seen = presses.filter(({ back }) => back);
  const first = seen[0];
  const moved = seen.filter(({ back }) => Math.abs(back.left - first.back.left) + Math.abs(back.top - first.back.top) > MAX_NAV_MOVE);
  return [...new Set(moved.map(({ to, back }) => `${first.to} at ${first.back.left},${first.back.top}; ${to} at ${back.left},${back.top}`))];
}

function noUndo(presses) {
  // The second press of a two-step key, such as RESET then RESET DESK, is the answer to a question: the
  // confirmation rule judges that, and a reset of a light cannot be undone.
  const isAnswer = (index) => index > 0 && REMOVES.test(presses[index - 1].label);
  return presses
    .filter(({ label, undo, asks }, index) => undo === false && !asks && REMOVES.test(label) && !isAnswer(index))
    .map(({ from, label }) => ({ screen: from, detail: label }));
}

function flowFindings(journey, trace) {
  const at = journey.name;
  const found = backAndForth(trace.presses).map((detail) => ({ rule: 'back-and-forth', screen: at, detail }));
  if (journey.steps && trace.presses.length > journey.steps) {
    const detail = `${trace.presses.length} presses, budget ${journey.steps}`;
    found.push({ rule: 'step-budget', screen: at, detail });
  }
  for (const { event, ms, screen } of trace.slow) found.push({ rule: 'slow-response', screen, detail: `${event} ${ms} ms` });
  if (trace.shift > MAX_SHIFT) {
    found.push({ rule: 'layout-shift', screen: at, detail: `CLS ${trace.shift.toFixed(2)}`, shifted: trace.shifted });
  }
  for (const detail of movingNav(trace.presses)) found.push({ rule: 'moving-nav', screen: at, detail });
  for (const { screen, detail } of noUndo(trace.presses)) found.push({ rule: 'no-undo', screen, detail });
  return found;
}

const keyOf = ({ rule, screen, detail }) => `${rule} | ${screen} | ${detail}`;

// Every finding of every story, once each, with the stories that saw it.
export function judge(traces) {
  const findings = new Map();
  for (const { journey, trace } of traces) {
    if (!trace) continue;
    for (const finding of [...trace.findings, ...flowFindings(journey, trace)]) {
      const key = keyOf(finding);
      const entry = findings.get(key) ?? { ...finding, key, stories: [] };
      entry.stories.push(journey.name);
      findings.set(key, entry);
    }
  }
  return [...findings.values()];
}

const readKnown = () => (existsSync(KNOWN) ? new Set(JSON.parse(readFileSync(KNOWN, 'utf8'))) : new Set());

function printRule(rule, findings) {
  console.log(`\n${rule} (${findings.length}): ${RULES[rule]}`);
  for (const { screen, detail, isNew, stories } of findings) {
    console.log(`  ${isNew ? 'NEW ' : ''}${screen}: ${detail}  [${stories[0]}${stories.length > 1 ? ` +${stories.length - 1}` : ''}]`);
  }
}

// The known list after this run: each `*` entry that still covers a finding, and every other finding by its key.
function knownAfter(findings, known) {
  const covers = (finding) => `${finding.rule} | ${finding.screen} | *`;
  const keys = findings.map((finding) => (known.has(covers(finding)) ? covers(finding) : finding.key));
  return [...new Set(keys)].sort();
}

// Prints the findings by rule and writes the report. Returns how many findings are new.
// With `updateKnown`, the findings of this run become the known list.
export function report(traces, { updateKnown = false } = {}) {
  const known = readKnown();
  // A known entry `rule | screen | *` covers that rule on that screen, for a finding whose words change from run to run.
  const isKnown = ({ key, rule, screen }) => known.has(key) || known.has(`${rule} | ${screen} | *`);
  const findings = judge(traces).map((finding) => ({ ...finding, isNew: !isKnown(finding) }));
  const rules = [...new Set(findings.map(({ rule }) => rule))].sort();
  console.log(`\n=== UX lint: ${findings.length} findings in ${traces.length} stories ===`);
  for (const rule of rules) printRule(rule, findings.filter((finding) => finding.rule === rule));
  mkdirSync(OUT, { recursive: true });
  const kept = traces.map(({ journey, trace }) => ({ journey: { name: journey.name, steps: journey.steps }, trace }));
  writeFileSync(TRACES, JSON.stringify(kept));
  writeFileSync(REPORT, `${JSON.stringify(findings, null, 2)}\n`);
  if (updateKnown) writeFileSync(KNOWN, `${JSON.stringify(knownAfter(findings, known), null, 2)}\n`);
  const fresh = updateKnown ? 0 : findings.filter(({ isNew }) => isNew).length;
  console.log(`\n${fresh} new UX findings, ${findings.length - fresh} known. Report: ${REPORT}`);
  return fresh;
}

if (process.argv[1]?.endsWith('report.mjs')) report(JSON.parse(readFileSync(TRACES, 'utf8')));
