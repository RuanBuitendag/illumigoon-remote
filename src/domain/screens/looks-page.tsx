import { PageFrame } from '../../composites';
import { closePage, useNavigation } from '../store/navigation-store';
import { lightsInScope, type Room } from '../store/rooms';
import { LookLibrary } from './look-library';

export function LooksPage({ room }: { room: Room }) {
  const scopeAddress = useNavigation((navigation) => navigation.scopeAddress);
  return (
    <PageFrame
      title="Looks"
      intro="Tap a look to play it. Tap the one that's playing to go back and adjust it."
      backLabel={room.name}
      onBack={closePage}
    >
      <LookLibrary lights={lightsInScope(room, scopeAddress)} />
    </PageFrame>
  );
}
