import type { ComponentProps } from 'react';
import { PageFrame, useIsWide } from '../../composites';
import { closePage, useNavigation } from '../store/navigation-store';
import { useRooms } from '../store/rooms';

// The back key is named after where it goes, and that depends on the tab under the page.
export function useBackLabel() {
  const rooms = useRooms();
  const tab = useNavigation((navigation) => navigation.tab);
  const roomId = useNavigation((navigation) => navigation.roomId);
  const isWide = useIsWide();
  if (tab === 'settings') return 'Settings';
  if (tab === 'rooms' && !isWide) return 'All rooms';
  return (rooms.find(({ id }) => id === roomId) ?? rooms[0])?.name ?? 'All rooms';
}

type AppPageProps = Omit<ComponentProps<typeof PageFrame>, 'backLabel' | 'onBack'>;

export function AppPage(props: AppPageProps) {
  return <PageFrame {...props} backLabel={useBackLabel()} onBack={closePage} />;
}
