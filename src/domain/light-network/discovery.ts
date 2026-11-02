import { Capacitor } from '@capacitor/core';
import { ZeroConf, type ZeroConfWatchResult } from '@mhaberler/capacitor-zeroconf-nsd';

// The firmware advertises under both names for one release.
const SERVICE_TYPES = ['_modulight._tcp.', '_illumigoon._tcp.'];

const DOMAIN = 'local.';

type DiscoveryEvents = {
  onFound: (name: string, address: string) => void;
  onLost: (name: string) => void;
  onRefused: () => void;
};

type FoundDevice = { name: string; addresses: string[] };

const HELPER_POLL_MS = 3000;

// A page has no Bonjour, so on a laptop the helper process finds the lights. ?light=<address> adds one by hand.
function discoverFromHelper({ onFound, onLost }: DiscoveryEvents) {
  for (const address of new URLSearchParams(location.search).getAll('light')) onFound(address, address);
  const known = new Set<string>();
  const poll = async () => {
    const reply = await fetch('/api/devices').catch(() => null);
    if (!reply?.ok) return;
    const { devices } = (await reply.json()) as { devices: FoundDevice[] };
    const names = new Set(devices.map(({ name }) => name));
    for (const name of known) if (!names.has(name)) onLost(name);
    known.clear();
    for (const { name, addresses } of devices) {
      const address = addresses[0];
      if (!address) continue;
      known.add(name);
      onFound(name, address);
    }
  };
  void poll();
  window.setInterval(() => void poll(), HELPER_POLL_MS);
}

let phoneEvents: DiscoveryEvents | null = null;

// The native search outlives a reload of the page, and it can stop when the network changes.
// `unwatch` never settles for a running search, so it is not awaited. The plugin runs the two calls in order.
export function restartDiscovery() {
  const events = phoneEvents;
  if (!events) return;
  for (const type of SERVICE_TYPES) {
    ZeroConf.unwatch({ type, domain: DOMAIN }).catch(() => undefined);
    // Capacitor passes a null result and an error when the search fails.
    const onEvent = (result: ZeroConfWatchResult | null) => {
      if (!result) {
        events.onRefused();
        return;
      }
      const { action, service } = result;
      const address = service.ipv4Addresses[0];
      if (action === 'removed') events.onLost(service.name);
      if (action === 'resolved' && address) events.onFound(service.name, address);
    };
    void ZeroConf.watch({ type, domain: DOMAIN }, onEvent);
  }
}

export function startDiscovery(events: DiscoveryEvents) {
  if (!Capacitor.isNativePlatform()) {
    discoverFromHelper(events);
    return;
  }
  phoneEvents = events;
}
