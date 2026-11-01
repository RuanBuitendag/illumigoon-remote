import './styles.css';
import App, { type OpenLight } from './App';
import { setSourceId } from './device/source';
import { setHostDialogs, setHostFetch, type HostDialogs, type HostFetch } from './host';

export type { HostDialogs, HostFetch, OpenLight };

type PatchEditorProps = {
  light: OpenLight;
  /** Answers the `/api` paths where the page has no server, as on the phone. */
  api?: HostFetch;
  /** The name the app signs its messages with. */
  identity: string;
  dialogs: HostDialogs;
  isOpen: boolean;
  isSaving: boolean;
  withChrome: boolean;
  onSaveOpen(): void;
  onSaveClosed(): void;
  onName(name: string): void;
  /** The socket has closed. */
  onLeave(): void;
  /** The light cannot be edited. */
  onClose(): void;
};

export function PatchEditor({ api, identity, dialogs, ...page }: PatchEditorProps) {
  if (api) setHostFetch(api);
  setHostDialogs(dialogs);
  setSourceId(identity);
  return (
    <div className="patch-editor">
      <App {...page} />
    </div>
  );
}
