import { Capacitor } from '@capacitor/core';
import { addressOf, followAddress, useNavigation } from './navigation-store';

// The browser's history follows the screens (NA-7). A move deeper, to a room, a page or a page under Room
// settings, adds a step, so the system Back gesture and the browser's Back go back one screen. A move to the
// side replaces the step, and a way back in the app goes back through the history, so the two never disagree.

type Screen = Pick<
  ReturnType<typeof useNavigation.getState>,
  'roomId' | 'isRoomOpen' | 'page' | 'parentPage' | 'isPageOpen' | 'pageRoomId'
>;

type Step = { key: string; screen: Screen };

const screenOf = ({ roomId, isRoomOpen, page, parentPage, isPageOpen, pageRoomId }: Screen): Screen => ({
  roomId,
  isRoomOpen,
  page,
  parentPage,
  isPageOpen,
  pageRoomId,
});

const keyOf = ({ roomId, isRoomOpen, page, parentPage, isPageOpen, pageRoomId }: Screen) =>
  `${isRoomOpen ? roomId : ''}|${isPageOpen ? `${pageRoomId}:${parentPage}:${page}` : ''}`;

const depthOf = ({ isRoomOpen, isPageOpen, parentPage }: Screen) =>
  Number(isRoomOpen) + Number(isPageOpen) + Number(isPageOpen && parentPage !== null);

const steps: Step[] = [];
let at = 0;
// While a step back or forward is shown, the screens follow the history, not the other way round.
let isPopping = false;

const urlOf = (screen: Screen) => addressOf(screen) || `${window.location.pathname}${window.location.search}`;

function record(screen: Screen, how: 'push' | 'replace') {
  if (how === 'push') {
    steps.splice(at + 1);
    at = steps.length;
  }
  steps[at] = { key: keyOf(screen), screen };
  window.history[how === 'push' ? 'pushState' : 'replaceState']({ step: at }, '', urlOf(screen));
}

// The nearest step back that shows this screen, if there is one.
const stepBackTo = (key: string) => steps.slice(0, at).findLastIndex((step) => step.key === key);

function follow(state: Screen) {
  if (isPopping) return;
  const screen = screenOf(state);
  const key = keyOf(screen);
  const here = steps[at];
  if (here?.key === key) return;
  const back = stepBackTo(key);
  if (back >= 0) window.history.go(back - at);
  else record(screen, here && depthOf(screen) > depthOf(here.screen) ? 'push' : 'replace');
}

// A step this run did not make: a new one the browser added for a typed address or a link, or an old one from
// before the page loaded again. The screens follow its address, and the step is taken as ours.
function adoptStep(step: number | null) {
  if (step === null) steps.splice(at + 1);
  at = step ?? steps.length;
  followAddress(window.location.hash);
  record(screenOf(useNavigation.getState()), 'replace');
}

function showStep(event: PopStateEvent) {
  const step = typeof event.state?.step === 'number' ? (event.state.step as number) : null;
  const target = step === null ? undefined : steps[step];
  if (step === null || !target) {
    adoptStep(step);
    return;
  }
  const current = screenOf(useNavigation.getState());
  at = step;
  if (target.key === keyOf(current)) return;
  useNavigation.setState(({ pageVisit }) => ({ ...target.screen, pageVisit: pageVisit + 1 }));
}

function onPop(event: PopStateEvent) {
  isPopping = true;
  try {
    showStep(event);
  } finally {
    isPopping = false;
  }
}

// A link to the app, `illumigoon://room/<id>/looks` or any address with `#/room/<id>/looks` in it, opens that
// screen. Edit is never opened from a link, and a link that comes while Edit is open waits for Edit to close.
export function addressOfLink(url: string) {
  const hash = url.indexOf('#');
  if (hash >= 0) return url.slice(hash);
  const [, rest] = /^[a-z][\w+.-]*:\/\/(.*)$/i.exec(url) ?? [];
  return rest === undefined ? '' : `#/${rest.replace(/^\/+/, '')}`;
}

function openLink(url: string) {
  const { page, isPageOpen } = useNavigation.getState();
  if (page === 'editor' && isPageOpen) return;
  followAddress(addressOfLink(url));
}

async function listenForLinks() {
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import('@capacitor/app');
  await App.addListener('appUrlOpen', ({ url }) => openLink(url));
  const launch = await App.getLaunchUrl();
  if (launch?.url) openLink(launch.url);
}

export function keepHistory() {
  followAddress(window.location.hash);
  const first = screenOf(useNavigation.getState());
  steps[0] = { key: keyOf(first), screen: first };
  window.history.replaceState({ step: 0 }, '', urlOf(first));
  useNavigation.subscribe(follow);
  window.addEventListener('popstate', onPop);
  void listenForLinks();
}
