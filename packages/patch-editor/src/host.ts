/**
 * How the editor reaches what a page cannot: the patch files and the list of lights.
 *
 * Every shell answers the same `/api` paths. The laptop answers from its helper process over HTTP,
 * and the phone answers inside the page, so nothing in the editor knows which one it is on.
 */

export type HostFetch = (path: string, init?: RequestInit) => Promise<Response>;

let current: HostFetch = (path, init) => fetch(path, init);

export const hostFetch: HostFetch = (path, init) => current(path, init);

export function setHostFetch(api: HostFetch) {
  current = api;
}
