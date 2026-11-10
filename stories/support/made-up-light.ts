import starfield from '../../src/domain/looks/patches/starfield.json';
import { FakeLight } from '../../scripts/regression/fake-light.mjs';

// Edit opens its own socket to the light, `ws://a1/ws`. In Storybook that socket goes to the fake light the
// journey tests use, so Edit draws a real patch and every change gets an answer. Nothing leaves the page.
// A socket to any other address is the browser's own, and fails as it would.
const BrowserSocket = window.WebSocket;
const lights = new Map<string, FakeLight>();

type Listener<T> = (value: T) => void;

// The side the fake light holds, in the shape of a Playwright socket route.
class LightSide {
  private messageListener: Listener<string> = () => undefined;
  private closeListener: Listener<void> = () => undefined;
  private readonly page: PageSide;

  constructor(page: PageSide) {
    this.page = page;
  }

  send(raw: string) {
    this.page.deliver(raw);
  }

  async close({ code }: { code: number }) {
    this.page.end(code);
  }

  onMessage(listener: Listener<string>) {
    this.messageListener = listener;
  }

  onClose(listener: Listener<void>) {
    this.closeListener = listener;
  }

  hear(raw: string) {
    this.messageListener(raw);
  }

  ended() {
    this.closeListener();
  }
}

// The side the page holds, in the shape of a browser WebSocket.
class PageSide extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = PageSide.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private readonly light = new LightSide(this);
  readonly url: string;

  constructor(url: string, fake: FakeLight) {
    super();
    this.url = url;
    setTimeout(() => {
      if (this.readyState !== PageSide.CONNECTING) return;
      this.readyState = PageSide.OPEN;
      fake.attach(this.light);
      this.onopen?.(new Event('open'));
    });
  }

  send(raw: string) {
    if (this.readyState === PageSide.OPEN) setTimeout(() => this.light.hear(raw));
  }

  close() {
    this.end(1000);
  }

  deliver(raw: string) {
    if (this.readyState === PageSide.OPEN) this.onmessage?.(new MessageEvent('message', { data: raw }));
  }

  end(code: number) {
    if (this.readyState === PageSide.CLOSED) return;
    this.readyState = PageSide.CLOSED;
    this.light.ended();
    this.onclose?.(new CloseEvent('close', { code, reason: '' }));
  }
}

function MadeUpSocket(url: string | URL, protocols?: string | string[]) {
  const fake = lights.get(new URL(url).host);
  return fake ? new PageSide(String(url), fake) : new BrowserSocket(url, protocols);
}
Object.assign(MadeUpSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });

// Left, at `a1` in the made-up house, playing Starfield. Returns what puts the browser's socket back.
export function answerAsLeft() {
  const left = new FakeLight({
    id: 'a1a1',
    name: 'Left',
    room: 'Bedroom',
    isMaster: true,
    animation: { type: 'patch', params: starfield },
  });
  lights.set('a1', left);
  window.WebSocket = MadeUpSocket as unknown as typeof WebSocket;
  return () => {
    left.stop();
    lights.delete('a1');
    window.WebSocket = BrowserSocket;
  };
}
