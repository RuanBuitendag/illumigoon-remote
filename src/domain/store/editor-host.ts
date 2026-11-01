import { Capacitor } from '@capacitor/core';

type HostFetch = (path: string, init?: RequestInit) => Promise<Response>;

let host: HostFetch | null = null;

async function phoneApi(path: string, init?: RequestInit) {
  if (!host) {
    const { phoneHost } = await import('@illumigoon/patch-editor/phone');
    host ??= phoneHost();
  }
  return host(path, init);
}

// A laptop has the helper process behind `/api`. A phone answers those paths in the page.
export const editorApi = Capacitor.isNativePlatform() ? phoneApi : undefined;
