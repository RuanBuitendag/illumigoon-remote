import type { ReactNode } from 'react';

export type HostFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type OpenLight = { url: string; name: string };

export function PatchEditor(props: {
  light?: OpenLight;
  api?: HostFetch;
  identity: string;
  onClose(): void;
}): ReactNode;
