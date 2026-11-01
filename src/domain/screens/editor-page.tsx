import { lazy, Suspense, useEffect } from 'react';
import { EditorLayout } from '../../composites';
import { APP_IDENTITY } from '../light-network/app-identity';
import { editorApi } from '../store/editor-host';
import { loadLibrary } from '../store/library-store';
import { closePage, useNavigation } from '../store/navigation-store';
import { lightsInScope, type Room } from '../store/rooms';

// The editor is large, so a phone that only sets looks never loads it.
const PatchEditor = lazy(async () => ({ default: (await import('@illumigoon/patch-editor')).PatchEditor }));

function firstLight(room: Room | undefined, scopeAddress: string | null) {
  if (!room) return undefined;
  const light = lightsInScope(room, scopeAddress).find(({ isOnline }) => isOnline);
  return light && { url: `ws://${light.address}/ws`, name: light.name };
}

export function EditorPage({ room }: { room: Room | undefined }) {
  const isOpen = useNavigation((navigation) => navigation.isPageOpen);
  const scopeAddress = useNavigation((navigation) => navigation.scopeAddress);
  // The editor can change scenes and palettes, so the home screen reads them again after it.
  useEffect(() => {
    if (!isOpen) void loadLibrary();
  }, [isOpen]);

  // The page stays while it slides away, and the editor's socket to the light must not.
  if (!isOpen) return null;
  return (
    <EditorLayout>
      <Suspense>
        <PatchEditor
          light={firstLight(room, scopeAddress)}
          api={editorApi}
          identity={APP_IDENTITY}
          onClose={closePage}
        />
      </Suspense>
    </EditorLayout>
  );
}
