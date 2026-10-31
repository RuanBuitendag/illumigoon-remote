import { create } from 'zustand';

type VersionsByChannel = Record<string, string>;

export const useLatestVersions = create<{ servers: Record<string, VersionsByChannel> }>(() => ({ servers: {} }));

const askedServers = new Set<string>();

async function readLatestVersions(server: string) {
  const response = await fetch(`${server.replace(/\/+$/, '')}/api/versions`);
  if (!response.ok) return null;
  const { latest } = (await response.json()) as { latest: Record<string, { version: string }> };
  return Object.fromEntries(Object.entries(latest).map(([channel, { version }]) => [channel, version]));
}

// A light names its own update server, so the app checks the server that the light will use.
// A failed check shows no alert, because the alert offers to overwrite a working light.
export function loadLatestVersions(server: string) {
  if (!server || askedServers.has(server)) return;
  askedServers.add(server);
  readLatestVersions(server)
    .then((versions) => {
      if (!versions) return;
      useLatestVersions.setState(({ servers }) => ({ servers: { ...servers, [server]: versions } }));
    })
    .catch(() => askedServers.delete(server));
}

const versionParts = (version: string) => /^v?(\d+(?:\.\d+)*)/.exec(version.trim())?.[1]?.split('.').map(Number);

// Text order fails on versions: "1.2.99" sorts after "1.2.308".
function isOlder(version: string, latest: string) {
  const mine = versionParts(version);
  const theirs = versionParts(latest);
  if (!mine || !theirs) return false;
  for (let index = 0; index < Math.max(mine.length, theirs.length); index += 1) {
    const difference = (mine[index] ?? 0) - (theirs[index] ?? 0);
    if (difference !== 0) return difference < 0;
  }
  return false;
}

type SoftwareFacts = { updateServer: string; softwareChannel: string; softwareVersion: string };

// A channel that the server does not list gives no alert. It says nothing about the light.
export function newVersionOf(light: SoftwareFacts, servers: Record<string, VersionsByChannel>) {
  const latest = servers[light.updateServer]?.[light.softwareChannel];
  return latest && isOlder(light.softwareVersion, latest) ? latest : null;
}
