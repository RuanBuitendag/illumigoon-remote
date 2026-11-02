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
