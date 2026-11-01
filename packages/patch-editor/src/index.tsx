import './styles.css';
import App, { type OpenLight } from './App';
import { setSourceId } from './device/source';
import { setHostFetch, type HostFetch } from './host';

export type { HostFetch, OpenLight };

type PatchEditorProps = {
  /** The light to open first. With none, the editor starts on its own house view. */
  light?: OpenLight;
  /** Answers the `/api` paths where the page has no server, as on the phone. */
  api?: HostFetch;
  /** The name the app signs its messages with. */
  identity: string;
  onClose(): void;
};

export function PatchEditor({ light, api, identity, onClose }: PatchEditorProps) {
  if (api) setHostFetch(api);
  setSourceId(identity);
  return (
    <div className="patch-editor">
      <App light={light} onClose={onClose} />
    </div>
  );
}
