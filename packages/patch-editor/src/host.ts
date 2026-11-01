/**
 * How the editor reaches what a page cannot: the patch files and the list of lights.
 *
 * Every shell answers the same `/api` paths. The laptop answers from its helper process over HTTP,
 * and the phone answers inside the page, so nothing in the editor knows which one it is on.
 */

export type HostFetch = (path: string, init?: RequestInit) => Promise<Response>;

/** What the editor asks a person, drawn by the app so it looks like the app. */
export type HostDialogs = {
  ask(text: string): Promise<boolean>;
  askName(text: string, suggestion: string): Promise<string | null>;
};

let current: HostFetch = (path, init) => fetch(path, init);

export const hostFetch: HostFetch = (path, init) => current(path, init);

export function setHostFetch(api: HostFetch) {
  current = api;
}

let dialogs: HostDialogs = { ask: async () => false, askName: async () => null };

export const ask: HostDialogs['ask'] = text => dialogs.ask(text);

export const askName: HostDialogs['askName'] = (text, suggestion) =>
  dialogs.askName(text, suggestion);

export function setHostDialogs(next: HostDialogs) {
  dialogs = next;
}
