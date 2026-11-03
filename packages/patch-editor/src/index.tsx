import './styles.css';
import App, { type EditedLook, type EditorSection, type OpenLight } from './App';
import { setSourceId } from './device/source';
import { setHostDialogs, setHostFetch, type HostDialogs, type HostFetch } from './host';

export type { EditedLook, EditorSection, HostDialogs, HostFetch, OpenLight };

type PatchEditorProps = {
  light: OpenLight;
  /** Answers the `/api` paths where the page has no server, as on the phone. */
  api?: HostFetch;
  /** The name the app signs its messages with. */
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
  /** Send a look from the library to lights the host picks. */
  /** The socket has closed. Carries the document on the light if this session changed it. */
  onLeave(look: EditedLook | null, isSaved: boolean): void;
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
