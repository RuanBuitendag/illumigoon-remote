import './styles.css';
import App, {
  type EditedLook, type EditorPageProps, type EditorSection, type OpenLight,
} from './App';
import { setSourceId } from './device/source';
import { setHostDialogs, setHostFetch, type HostDialogs, type HostFetch } from './host';

export type { EditedLook, EditorSection, HostDialogs, HostFetch, OpenLight };

type PatchEditorProps = EditorPageProps & {
  /** Answers the `/api` paths where the page has no server, as on the phone. */
  api?: HostFetch;
  /** The name the app signs its messages with. */
  identity: string;
  dialogs: HostDialogs;
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
