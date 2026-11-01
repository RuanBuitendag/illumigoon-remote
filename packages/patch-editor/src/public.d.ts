import type { ReactNode } from 'react';

export type HostFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type HostDialogs = {
  ask(text: string): Promise<boolean>;
  askName(text: string, suggestion: string): Promise<string | null>;
};

export type EditorSection = 'layers' | 'colour' | 'motion' | 'controls' | 'roll';

export type OpenLight = { url: string; name: string; lookName?: string };

export function PatchEditor(props: {
  light: OpenLight;
  api?: HostFetch;
  identity: string;
  dialogs: HostDialogs;
  isOpen: boolean;
  section: EditorSection;
  isSaving: boolean;
  withChrome: boolean;
  onSaveOpen(): void;
  onSaveClosed(): void;
  onSection(section: EditorSection): void;
  onName(name: string): void;
  onLeave(): void;
  onClose(): void;
}): ReactNode;
