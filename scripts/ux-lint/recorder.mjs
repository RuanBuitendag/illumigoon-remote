// The UX lint's recorder (LIFE-1891). It watches a story's page the way a person would use it: each press, the
// screen it was on and the screen it led to, how long the app took to answer, how much the page jumped, and what
// the screen rules found on every screen the story saw. The story itself does not change.
import { SCREEN_SCRIPT } from './screen-rules.mjs';

// How long after a press the screen counts as settled, for the screen rules.
const SETTLE_MS = 400;
// An answer slower than this is reported (INP, Interaction to Next Paint: "good" is under 200 ms).
const SLOW_MS = 200;

function newTrace() {
  return { presses: [], findings: [], slow: [], shift: 0 };
}

function pressLabel(target) {
  const control = target?.closest?.('button, a, [role], input, select, textarea, label, canvas') ?? target;
  if (!control?.tagName) return 'page';
  const words = control.getAttribute('aria-label') || control.innerText || control.getAttribute('placeholder') || '';
  const text = words.replace(/\s+/g, ' ').trim().slice(0, 30);
  return text ? `${control.tagName.toLowerCase()} "${text}"` : control.tagName.toLowerCase();
}

function settle(trace) {
  const seen = new Set(trace.findings.map(({ rule, screen, detail }) => `${rule}|${screen}|${detail}`));
  for (const finding of window.uxInspectScreen()) {
    const key = `${finding.rule}|${finding.screen}|${finding.detail}`;
    if (!seen.has(key)) trace.findings.push(finding);
    seen.add(key);
  }
  const last = trace.presses.at(-1);
  if (last && !last.to) last.to = screenName();
}

function watchPresses(trace) {
  let timer = 0;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => settle(trace), SETTLE_MS);
  };
  const press = (target) => {
    trace.presses.push({ label: pressLabel(target), from: screenName(), to: null });
    later();
  };
  window.addEventListener('pointerdown', (event) => press(event.target), true);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') press(event.target);
  }, true);
  window.addEventListener('load', later);
}

function watchFeel(trace) {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > SLOW_MS && entry.interactionId) {
        trace.slow.push({ event: entry.name, ms: Math.round(entry.duration), screen: screenName() });
      }
    }
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  // CLS, Cumulative Layout Shift: the largest group of jumps that come within 1 s of each other, over at most 5 s.
  let group = { score: 0, first: 0, last: 0 };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      const isNew = entry.startTime - group.last > 1000 || entry.startTime - group.first > 5000;
      group = isNew ? { score: 0, first: entry.startTime, last: 0 } : group;
      group.score += entry.value;
      group.last = entry.startTime;
      trace.shift = Math.max(trace.shift, group.score);
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

function startRecorder() {
  const trace = newTrace();
  window.__ux = trace;
  // Playwright runs this script inside a function, so the page sees only what goes on `window`.
  window.uxSettle = () => settle(trace);
  watchPresses(trace);
  watchFeel(trace);
}

const RECORDER_SCRIPT = [
  SCREEN_SCRIPT,
  `const SETTLE_MS = ${SETTLE_MS};`,
  `const SLOW_MS = ${SLOW_MS};`,
  ...[newTrace, pressLabel, settle, watchPresses, watchFeel, startRecorder].map(String),
  'startRecorder();',
].join('\n');

// Before the page opens: every document of the page gets the recorder.
export async function installRecorder(page) {
  await page.addInitScript({ content: RECORDER_SCRIPT });
}

// After the story: what the recorder saw, with the last screen read again. Empty when the page is gone.
export async function readTrace(page) {
  const read = () => {
    if (!window.__ux) return null;
    window.uxSettle();
    return window.__ux;
  };
  return page.evaluate(read).catch(() => null);
}
