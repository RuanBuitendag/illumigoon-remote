import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const REPOSITORY = 'RuanBuitendag/illumigoon-remote';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? 'dev';

const bundleUrl = (version: string) =>
  `https://github.com/${REPOSITORY}/releases/download/${version}/update.zip`;

async function readLatestVersion() {
  const response = await fetch(LATEST_RELEASE_URL);
  if (!response.ok) return null;
  const { tag_name: version } = (await response.json()) as { tag_name: string };
  return version;
}

// The plugin installs the bundle next time the app goes to the background.
async function queueLatestBundle() {
  const version = await readLatestVersion();
  if (!version || version === APP_VERSION) return;
  const { bundles } = await CapacitorUpdater.list();
  const known = bundles.find((bundle) => bundle.version === version);
  // The plugin rolled this one back, so wait for a newer release.
  if (known?.status === 'error') return;
  const bundle = known ?? (await CapacitorUpdater.download({ url: bundleUrl(version), version }));
  await CapacitorUpdater.next({ id: bundle.id });
}

function checkForUpdate() {
  // With no internet the app stays on its current version.
  queueLatestBundle().catch(() => undefined);
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
