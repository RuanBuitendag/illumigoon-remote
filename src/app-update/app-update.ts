import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { create } from 'zustand';

const REPOSITORY = 'RuanBuitendag/illumigoon-remote';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? 'dev';

export const useUpdateError = create<{ message: string | null }>(() => ({ message: null }));

const bundleUrl = (version: string) =>
  `https://github.com/${REPOSITORY}/releases/download/${version}/update.zip`;

async function readLatestRelease() {
  const response = await fetch(LATEST_RELEASE_URL);
  if (!response.ok) return null;
  // The Web update workflow writes the SHA-256 of update.zip as the release notes.
  const { tag_name: version, body: checksum } = (await response.json()) as { tag_name: string; body: string };
  return { version, checksum: checksum.trim() };
}

// The plugin installs the bundle next time the app goes to the background.
async function queueLatestBundle() {
  const release = await readLatestRelease();
  if (!release || release.version === APP_VERSION) return;
  const { version, checksum } = release;
  const { bundles } = await CapacitorUpdater.list();
  const known = bundles.find((bundle) => bundle.version === version);
  // The plugin rolled this one back, so wait for a newer release.
  if (known?.status === 'error') return;
  const bundle = known ?? (await CapacitorUpdater.download({ url: bundleUrl(version), version, checksum }));
  await CapacitorUpdater.next({ id: bundle.id });
}

function checkForUpdate() {
  useUpdateError.setState({ message: null });
  queueLatestBundle().catch((error: unknown) => {
    useUpdateError.setState({ message: error instanceof Error ? error.message : String(error) });
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
