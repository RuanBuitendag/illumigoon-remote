import { isBeforeVersion } from './firmware-versions';
import type { Light } from './fleet-store';

// Firmware before this version can run out of memory and restart when a long look replaces a long
// look. A light also saves its look a second after each change.
const FIRST_SAFE_VERSION = '1.2.454';
const GAP_MS = 1500;
const OLDER_GAP_MS = 4000;

export const isOlder = ({ softwareVersion }: Light) => isBeforeVersion(softwareVersion, FIRST_SAFE_VERSION);
export const gapOf = (light: Light) => (isOlder(light) ? OLDER_GAP_MS : GAP_MS);

// Work a light is waiting for. A newer change to that light replaces it, so an older look never lands
// on top of a newer one.

const waiting = new Map<string, number>();

export function cancelWaiting(address: string) {
  window.clearTimeout(waiting.get(address));
  waiting.delete(address);
}

export function laterOn(address: string, wait: number, work: () => void) {
  cancelWaiting(address);
  waiting.set(
    address,
    window.setTimeout(() => {
      waiting.delete(address);
      work();
    }, wait),
  );
}
