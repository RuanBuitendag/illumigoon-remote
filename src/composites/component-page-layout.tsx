import { useEffect, type ReactNode } from 'react';
import { ColourFill } from '../design-system';

// The frame of the component page (D68): every primitive and composite of the two doors, in each of its
// states, on the dev server at `?components`.

type ComponentPageLayoutProps = { title: string; intro: string; children: ReactNode };

export function ComponentPageLayout({ title, intro, children }: ComponentPageLayoutProps) {
  useEffect(() => {
    void import('./component-page.css');
  }, []);
  return (
    <div className="component-page">
      <h1 className="page-title">{title}</h1>
      <p className="page-intro">{intro}</p>
      {children}
    </div>
  );
}

type ComponentEntryProps = { name: string; door: string; children: ReactNode };

// One export of a door, with its states side by side.
export function ComponentEntry({ name, door, children }: ComponentEntryProps) {
  return (
    <section className="component-entry" aria-label={name}>
      <h2 className="component-entry-name">
        {name}
        <span className="component-entry-door">{door}</span>
      </h2>
      <div className="component-states">{children}</div>
    </section>
  );
}

export function ComponentState({ state, children }: { state: string; children: ReactNode }) {
  return (
    <div className="component-state">
      <span className="component-state-name">{state}</span>
      {children}
    </div>
  );
}

// Holds a component that fills the window, such as a screen, a sheet or a toast, inside a box of its own,
// so the page keeps scrolling around it. A line is a toast's height; a screen is the window's.
export function ComponentFrame({ size, children }: { size: 'line' | 'screen'; children: ReactNode }) {
  return (
    <div className="component-frame" data-size={size}>
      {children}
    </div>
  );
}

// A painted area as the composites give it a size: here a box a thumb wide.
export function PaintSample({ paint }: { paint?: string }) {
  return <ColourFill className="paint-sample" paint={paint} />;
}
