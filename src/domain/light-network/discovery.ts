import { Capacitor } from '@capacitor/core';
import { ZeroConf } from '@mhaberler/capacitor-zeroconf-nsd';

// The firmware advertises under both names for one release.
const SERVICE_TYPES = ['_modulight._tcp.', '_illumigoon._tcp.'];

type DiscoveryEvents = {
  onFound: (name: string, address: string) => void;
  onLost: (name: string) => void;
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

export function startDiscovery(events: DiscoveryEvents) {
  if (!Capacitor.isNativePlatform()) {
    discoverFromHelper(events);
    return;
  }
  for (const type of SERVICE_TYPES) {
    void ZeroConf.watch({ type, domain: 'local.' }, ({ action, service }) => {
      const address = service.ipv4Addresses[0];
      if (action === 'removed') events.onLost(service.name);
      if (action === 'resolved' && address) events.onFound(service.name, address);
    });
  }
}
