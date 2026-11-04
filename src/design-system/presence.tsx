import { useEffect, useRef, useState, type ReactNode } from 'react';

// Keeps what it held on screen for its leaving motion after it goes, so a toast leaves instead of vanishing.
// While it leaves it is inert, and `data-leaving` lets the style sheet give it its exit. When every motion inside
// has finished, it lets go. Something new arriving replaces it at once.
export function Presence({ children }: { children: ReactNode }) {
  const [held, setHeld] = useState<ReactNode>(children);
  const place = useRef<HTMLDivElement>(null);
  if (children && children !== held) setHeld(children);
  const isLeaving = !children && Boolean(held);

  useEffect(() => {
    if (!isLeaving || !place.current) return;
    let isWaiting = true;
    const motions = place.current.getAnimations({ subtree: true }).map((motion) => motion.finished);
    void Promise.allSettled(motions).then(() => {
      if (isWaiting) setHeld(null);
    });
    return () => {
      isWaiting = false;
    };
  }, [isLeaving]);

  return (
    <div className="presence" ref={place} data-leaving={isLeaving || undefined} inert={isLeaving}>
      {children || held}
    </div>
  );
}
