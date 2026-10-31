import { Capacitor } from '@capacitor/core';
import { ZeroConf } from '@mhaberler/capacitor-zeroconf-nsd';

// The firmware advertises under both names for one release.
const SERVICE_TYPES = ['_modulight._tcp.', '_illumigoon._tcp.'];

type DiscoveryEvents = {
  onFound: (name: string, address: string) => void;
  onLost: (name: string) => void;
};

// A browser has no Bonjour, so on localhost the addresses come from ?light=<address> in the URL.
function discoverFromUrl({ onFound }: DiscoveryEvents) {
  for (const address of new URLSearchParams(location.search).getAll('light')) onFound(address, address);
}

export function startDiscovery(events: DiscoveryEvents) {
  if (!Capacitor.isNativePlatform()) {
    discoverFromUrl(events);
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
