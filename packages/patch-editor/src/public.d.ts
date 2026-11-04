import type { ReactNode } from 'react';

export type HostFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type HostDialogs = {
  ask(text: string): Promise<boolean>;
  askName(text: string, suggestion: string): Promise<string | null>;
};

export type EditedLook = { type: string; params: Record<string, unknown> };

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
  onSaveOpen(): void;
  onSaveClosed(): void;
  onSection(section: EditorSection): void;
  onName(name: string): void;
  /** The light has said what it plays, and the editor shows it. */
  onOpened(look: EditedLook): void;
  /** Whether the look has changes no file holds yet. */
  onUnsaved?(isUnsaved: boolean): void;
  /**
   * The look once a change has rested, for a host that keeps it (LIFE-1966). A reload, or iOS closing the app,
   * ends the page while the lights play on, so the host writes it where the person will look for it.
   */
  onChange?(look: EditedLook): void;
  onLeave(look: EditedLook | null, isSaved: boolean): void;
  onClose(): void;
}): ReactNode;

/** Edit's controls in their states, with made-up props, for the app's component page (D68). */
export const EDIT_SPECIMENS: { name: string; states: Record<string, ReactNode> }[];
