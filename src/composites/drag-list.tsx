import type { ReactNode } from 'react';
import { useDragOrder } from '../design-system';

type DragListProps = {
  ids: string[];
  onOrder: (ids: string[]) => void;
  children: ReactNode;
};

type DragListOptions = DragListProps & { handle: string; needsHold: boolean };

function DragList({ children, ...options }: DragListOptions) {
  const { listRef, ...press } = useDragOrder(options);
  return (
    <div ref={listRef} className="drag-list" {...press}>
      {children}
    </div>
  );
}

export function LightDragList(props: DragListProps) {
  return <DragList {...props} handle=".arrange-grip" needsHold={false} />;
}

// The card opens on a tap and lets the page scroll, so it only lifts after a hold.
export function RoomDragList(props: DragListProps) {
  return <DragList {...props} handle=".room-open" needsHold />;
}
