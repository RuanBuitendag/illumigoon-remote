// The UX lint's rules for one screen (LIFE-1891). Each rule reads what a person sees on the top layer of the app
// and returns findings. They run inside the page: `SCREEN_SCRIPT` joins them into one script, so each function
// here may only use the browser and the other functions in this file.
//
// A rule is a fact about a screen that Ruan has rejected, written so a machine can find it. A rule that fires on a
// screen he approved is a wrong rule: change the rule, not the screen.

// What each rule means and how to fix it, in plain words, for the agent that reads the report.
export const SCREEN_RULES = {
  'said-twice': 'One fact shows twice on one screen. Keep it in one place, the place a person looks for it.',
  'technical-word': 'A word from the code shows to a person. Say what it means to them, or show nothing.',
  'orange-accent': 'An orange or amber colour outside the light itself. Use the neutral tokens; the light is the colour.',
  'tinted-panel': 'A panel with a tinted background. Panels are flat; colour belongs to the strip only.',
  'confirmation': 'A question before an action. Do the action and offer undo.',
  'stacked-sheets': 'A sheet opened over another sheet. One sheet at a time; finish or replace the first.',
  'no-way-back': 'A screen with no way back. Every screen past the first has a back key.',
  'empty-section': 'A heading with nothing under it. Show the section when it has something, or say how to fill it.',
  'too-many-jobs': 'The screen does too many jobs, so it has no focus. Keep the one job people come here for, and at most two '
    + 'that serve it; move each other job to its own place.',
  'section-does-too-much': 'One section holds too many different actions, so it reads as clutter. Keep the action the '
    + 'section is named for; move the others to where that job is done.',
  'too-many-controls': 'Too many things to press in one view. Show the controls of the main job; put the rest one step away.',
};

const CODE_WORDS = /\b(null|undefined|NaN|json|payload|websocket|socket|firmware|ota|params?|enum|uuid)\b/i;
const EDITOR_WORDS = /\b(lfo|matrix|slot|modulator|patch|emitter|warp)\b/i;
const LIGHT = 'canvas, .led-strip, [aria-hidden="true"]';
const MIN_SAID_TWICE = 6;
const MIN_PANEL_AREA = 4000;
// Ruan, 4 Nov 2026: Home failed with rooms, lights, recent looks, now playing, on and off and add a light on one
// screen; the room passed with scenes, lights and its look. A job is a section or region of the screen. Sections
// that hold the same kind of things, such as the groups of the Looks page, are one job. A row that only leads to
// another place is not a job.
const MAX_JOBS = 3;
// The Lounge on the phone shows 24, and Ruan let it pass; Edit on the laptop shows 80.
const MAX_CONTROLS = 26;
const JOB = 'section, [role="region"], fieldset, nav, aside';
const NOT_JOB = '[role="status"], [role="alert"], .toast';
// Ruan passed the room's scene shelf (the scenes, + SAVE) and its lights (ALL, the list of lights), and failed the
// look under them (name, EDIT, CHANGE, colours, settings, SAVE AS NEW). A list of the same rows is one action.
const MAX_ACTIONS = 4;
const CONTROL = 'button, a[href], input, select, textarea, [role="button"], [role="slider"], [role="switch"], [role="tab"]';

function isShown(element) {
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return false;
  if (element.closest('[inert]')) return false;
  return getComputedStyle(element).visibility !== 'hidden';
}

function openSheets() {
  return [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(isShown);
}

function topLayer() {
  const sheets = openSheets();
  if (sheets.length > 0) return sheets.at(-1);
  const screens = [...document.querySelectorAll('main.screen:not([inert])')];
  return screens.at(-1) ?? document.body;
}

function screenName() {
  const sheet = openSheets().at(-1);
  const screens = [...document.querySelectorAll('main.screen:not([inert])')];
  const top = screens.at(-1);
  const title = top?.querySelector('h1')?.innerText.trim() || top?.className.replace('screen ', '') || 'app';
  return sheet ? `${title} > ${sheet.getAttribute('aria-label') ?? 'sheet'}` : title;
}

function describe(element) {
  const text = (element.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const name = `${element.tagName.toLowerCase()}${element.classList[0] ? `.${element.classList[0]}` : ''}`;
  return text ? `${name} "${text}"` : name;
}

function ownText(element) {
  const parts = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.data);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// The list that an element is a row of: the parent of its nearest ancestor that has a sibling of the same class.
function listOf(element) {
  for (let item = element; item?.parentElement; item = item.parentElement) {
    const twins = [...item.parentElement.children].filter((other) => other.className === item.className);
    if (item.className && twins.length > 1) return item.parentElement;
  }
  return null;
}

// The same words in every row of one list, such as a version on each light, are a column, not a repeat.
function isColumn(elements) {
  const lists = new Set(elements.map(listOf));
  return lists.size === 1 && !lists.has(null);
}

function saidTwice(layer) {
  const places = new Map();
  for (const element of layer.querySelectorAll('*')) {
    const text = ownText(element);
    if (text.length < MIN_SAID_TWICE || !text.includes(' ') || element.closest('option') || !isShown(element)) continue;
    places.set(text, [...(places.get(text) ?? []), element]);
  }
  return [...places]
    .filter(([, elements]) => elements.length > 1 && !isColumn(elements))
    .map(([text, elements]) => `"${text}" ${elements.length} times`);
}

function technicalWords(layer) {
  const found = [];
  for (const element of layer.querySelectorAll('*')) {
    const text = ownText(element);
    if (!text || !isShown(element)) continue;
    const isEditor = Boolean(element.closest('.patch-editor'));
    const word = text.match(CODE_WORDS) ?? (isEditor ? null : text.match(EDITOR_WORDS));
    if (word) found.push(`"${word[0]}" in ${describe(element)}`);
  }
  return found;
}

function hslOf(colour) {
  const parts = colour.match(/[\d.]+/g)?.map(Number);
  if (!parts || parts.length < 3 || (parts[3] ?? 1) < 0.3) return null;
  const [r, g, b] = parts.slice(0, 3).map((value) => value / 255);
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const lightness = (high + low) / 2;
  const range = high - low;
  if (range === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = range / (1 - Math.abs(2 * lightness - 1));
  const sector = high === r ? ((g - b) / range + 6) % 6 : high === g ? (b - r) / range + 2 : (r - g) / range + 4;
  return { hue: sector * 60, saturation, lightness };
}

function isOrange(colour) {
  const hsl = hslOf(colour);
  if (!hsl) return false;
  const { hue, saturation, lightness } = hsl;
  return hue >= 15 && hue <= 48 && saturation > 0.45 && lightness > 0.3 && lightness < 0.8;
}

function orangeAccents(layer) {
  const found = new Set();
  for (const element of layer.querySelectorAll('*')) {
    if (element.closest(LIGHT) || !isShown(element)) continue;
    const style = getComputedStyle(element);
    const paints = [style.color, style.backgroundColor, style.fill];
    if (parseFloat(style.borderTopWidth) > 0) paints.push(style.borderTopColor);
    if (paints.some(isOrange)) found.add(describe(element));
  }
  return [...found];
}

function isTinted(colour) {
  const hsl = hslOf(colour);
  return Boolean(hsl) && hsl.saturation > 0.2 && hsl.lightness > 0.08 && hsl.lightness < 0.95;
}

function tintedPanels(layer) {
  const found = [];
  for (const element of layer.querySelectorAll('div, section, article, li')) {
    if (element.closest(LIGHT) || !isShown(element)) continue;
    const { width, height } = element.getBoundingClientRect();
    if (width * height < MIN_PANEL_AREA) continue;
    if (isTinted(getComputedStyle(element).backgroundColor)) found.push(describe(element));
  }
  return found;
}

function confirmations() {
  return openSheets()
    .filter((sheet) => {
      const words = sheet.innerText;
      const hasCancel = [...sheet.querySelectorAll('button')].some((key) => /^\s*(cancel|keep|stay|no)\b/i.test(key.innerText));
      return hasCancel && /\?|\b(sure|discard|leave|lose|delete)\b/i.test(words);
    })
    .map(describe);
}

function noWayBack() {
  const screens = [...document.querySelectorAll('main.screen:not([inert])')];
  const top = screens.at(-1);
  if (!top || top.classList.contains('screen-home')) return [];
  // On the laptop a screen can stand beside the one it came from, which is the way back.
  if (top.getBoundingClientRect().width < innerWidth * 0.75) return [];
  const back = [...top.querySelectorAll('.back-key')].some(isShown);
  return back ? [] : [describe(top)];
}

// A section whose only part is its heading row. A heading row with a switch or a field is a setting, not empty.
function emptySections(layer) {
  return [...layer.querySelectorAll('section')]
    .filter((section) => {
      const parts = [...section.children].filter(isShown);
      if (!isShown(section) || parts.length !== 1) return false;
      const isHeading = Boolean(parts[0].querySelector('h2, h3, .eyebrow'));
      return isHeading && !parts[0].querySelector('input, select, textarea, [role="switch"], [role="slider"], [aria-expanded]');
    })
    .map(describe);
}

function jobName(element) {
  const heading = element.querySelector('h1, h2, h3, h4, legend, .eyebrow');
  const name = element.getAttribute('aria-label') || heading?.innerText || element.classList[0] || element.tagName;
  return name.replace(/\s+/g, ' ').trim().slice(0, 24).toLowerCase();
}

// What a part of the screen lets a person do: the kinds of control in it.
function kindOf(element) {
  const kinds = [...element.querySelectorAll(CONTROL)].map((control) => control.classList[0] ?? control.tagName);
  return [...new Set(kinds)].sort().join(' ');
}

// The list inside `section` that a control is a row of, or null.
function rowListIn(control, section) {
  for (let item = control; item && item !== section; item = item.parentElement) {
    const twins = [...item.parentElement.children].filter((other) => other.className === item.className);
    // Two keys side by side, such as EDIT and CHANGE, are two actions; three or more alike are a list.
    const least = item === control ? 3 : 2;
    if (item.className && twins.length >= least) return item.parentElement;
  }
  return null;
}

function controlLabel(control) {
  const label = (control.getAttribute('aria-label') || control.innerText || '').trim().slice(0, 16).toLowerCase();
  return label || control.classList[0] || control.tagName.toLowerCase();
}

function actionsOf(section) {
  const actions = new Map();
  const lists = [];
  for (const control of [...section.querySelectorAll(CONTROL)].filter(isShown)) {
    const list = rowListIn(control, section);
    if (list && !lists.includes(list)) lists.push(list);
    if (list) actions.set(`list ${lists.indexOf(list)}`, `list of ${list.classList[0] ?? 'rows'}`);
    else actions.set(`${control.classList[0]} ${controlLabel(control)}`, controlLabel(control));
  }
  return [...actions.values()];
}

function busySections(layer) {
  return [...layer.querySelectorAll('section')]
    .filter(isShown)
    .map((section) => ({ section, actions: actionsOf(section) }))
    .filter(({ actions }) => actions.length > MAX_ACTIONS)
    .map(({ section, actions }) => `${jobName(section)}: ${actions.length} actions: ${actions.join(', ')}`);
}

function isJob(element) {
  if (!isShown(element) || element.closest(NOT_JOB) || element.parentElement?.closest(JOB)) return false;
  return element.querySelectorAll(CONTROL).length > 1 || Boolean(element.querySelector('h2, h3, .eyebrow'));
}

function tooManyJobs(layer) {
  const jobs = new Map();
  for (const element of [...layer.querySelectorAll(JOB)].filter(isJob)) {
    const kind = kindOf(element) || jobName(element);
    jobs.set(kind, [...(jobs.get(kind) ?? []), jobName(element)]);
  }
  const names = [...jobs.values()].map((same) => same.join(' + '));
  return names.length > MAX_JOBS ? [`${names.length} jobs: ${names.join(', ')}`] : [];
}

function inView(element) {
  const box = element.getBoundingClientRect();
  return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
}

function tooManyControls(layer) {
  const controls = [...layer.querySelectorAll(CONTROL)].filter((element) => isShown(element) && inView(element));
  return controls.length > MAX_CONTROLS ? [`${controls.length} controls in view`] : [];
}

function inspectScreen() {
  const layer = topLayer();
  const sheets = openSheets();
  const checks = {
    'said-twice': () => saidTwice(layer),
    'technical-word': () => technicalWords(layer),
    'orange-accent': () => orangeAccents(layer),
    'tinted-panel': () => tintedPanels(layer),
    'confirmation': confirmations,
    'stacked-sheets': () => (sheets.length > 1 ? [`${sheets.length} sheets: ${sheets.map(describe).join(', ')}`] : []),
    'no-way-back': noWayBack,
    'empty-section': () => emptySections(layer),
    'too-many-jobs': () => tooManyJobs(layer),
    'section-does-too-much': () => busySections(layer),
    'too-many-controls': () => tooManyControls(layer),
  };
  const screen = screenName();
  return Object.entries(checks).flatMap(([rule, check]) => check().map((detail) => ({ rule, screen, detail })));
}

const IN_PAGE = [isShown, openSheets, topLayer, screenName, describe, ownText, listOf, isColumn, saidTwice, technicalWords, hslOf, isOrange,
  orangeAccents, isTinted, tintedPanels, confirmations, noWayBack, emptySections, jobName, kindOf, rowListIn, controlLabel, actionsOf, busySections, isJob, tooManyJobs, inView, tooManyControls,
  inspectScreen];

// One script that defines every rule in the page and `window.uxInspectScreen`.
export const SCREEN_SCRIPT = [
  `const CODE_WORDS = ${CODE_WORDS};`,
  `const EDITOR_WORDS = ${EDITOR_WORDS};`,
  `const LIGHT = ${JSON.stringify(LIGHT)};`,
  `const MIN_SAID_TWICE = ${MIN_SAID_TWICE};`,
  `const MIN_PANEL_AREA = ${MIN_PANEL_AREA};`,
  `const MAX_JOBS = ${MAX_JOBS};`,
  `const MAX_CONTROLS = ${MAX_CONTROLS};`,
  `const JOB = ${JSON.stringify(JOB)};`,
  `const NOT_JOB = ${JSON.stringify(NOT_JOB)};`,
  `const MAX_ACTIONS = ${MAX_ACTIONS};`,
  `const CONTROL = ${JSON.stringify(CONTROL)};`,
  ...IN_PAGE.map(String),
  'window.uxInspectScreen = inspectScreen;',
].join('\n');
