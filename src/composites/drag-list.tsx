import type { ReactNode } from 'react';
import { useDragOrder } from '../design-system';

type DragListProps = {
  ids: string[];
  onOrder: (ids: string[]) => void;
  children: ReactNode;
};

export function LightDragList({ ids, onOrder, children }: DragListProps) {
  const { listRef, ...press } = useDragOrder({ ids, handle: '.arrange-grip', needsHold: false, onOrder });
  return (
    <div ref={listRef} className="drag-list" {...press}>
      {children}
    </div>
  );
}
