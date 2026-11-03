// Runs before every unit test file. A unit test never reaches a light or the network: a socket or a
// request throws at once, so a test that tries fails instead of finding a real light.
import { vi } from 'vitest';

// The zero-configuration plugin rejects a promise when its file loads, which no page code can catch.
// Unit tests never look for lights, so they get a plugin that does nothing.
vi.mock('@mhaberler/capacitor-zeroconf-nsd', () => ({ ZeroConf: {} }));

const refuse = (what) => () => {
  throw new Error(`a unit test tried to open a ${what}`);
};

vi.stubGlobal('WebSocket', vi.fn(refuse('socket')));
vi.stubGlobal('fetch', vi.fn(refuse('request')));
