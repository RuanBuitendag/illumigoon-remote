import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { create } from 'zustand';

const REPOSITORY = 'RuanBuitendag/illumigoon-remote';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? 'dev';

export const useUpdateError = create<{ message: string | null }>(() => ({ message: null }));

/** What the last check did, for the Version row in Settings. Null before the first check. */
export const useUpdateStatus = create<{ status: string | null }>(() => ({ status: null }));
const say = (status: string) => useUpdateStatus.setState({ status });

const CHECK_TIMEOUT_MS = 20_000;

const bundleUrl = (version: string) =>
  `https://github.com/${REPOSITORY}/releases/download/${version}/update.zip`;

async function readLatestRelease() {
  const response = await fetch(LATEST_RELEASE_URL, { cache: 'no-store', signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`GitHub replied ${response.status}`);
  // The Web update workflow writes the SHA-256 of update.zip as the release notes.
  const { tag_name: version, body: checksum } = (await response.json()) as { tag_name: string; body: string };
  return { version, checksum: checksum.trim() };
}

// `set` reloads the page into the new bundle at once, so an update never waits for the app to go to the background.
async function installLatestBundle() {
  say('Checking');
  const { version, checksum } = await readLatestRelease();
  if (version === APP_VERSION) return say('Up to date');
  const { bundles } = await CapacitorUpdater.list();
  const known = bundles.find((bundle) => bundle.version === version);
  // The plugin rolled this one back, so wait for a newer release.
  if (known?.status === 'error') return say(`${version} failed to start, waiting for a newer one`);
  say(`Downloading ${version}`);
  const bundle = known ?? (await CapacitorUpdater.download({ url: bundleUrl(version), version, checksum }));
  say(`Installing ${version}`);
  await CapacitorUpdater.set({ id: bundle.id });
  return undefined;
}

export function checkForUpdate() {
  if (!Capacitor.isNativePlatform()) return say('Updates only run in the phone app');
  useUpdateError.setState({ message: null });
  installLatestBundle().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    useUpdateError.setState({ message });
    say(`Failed: ${message}`);
  });
}

export function startAppUpdate() {
  if (!Capacitor.isNativePlatform()) return;
  // Without this call in 10 seconds, the plugin rolls back to the last good bundle.
  void CapacitorUpdater.notifyAppReady();
  checkForUpdate();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}
