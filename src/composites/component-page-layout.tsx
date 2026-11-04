import { useEffect, useRef, useState, type ReactNode } from 'react';
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

type ComponentEntryProps = { name: string; door: string; notes?: ReactNode; children: ReactNode };

// One export of a door: its notes, then its states side by side.
export function ComponentEntry({ name, door, notes, children }: ComponentEntryProps) {
  return (
    <section className="component-entry" aria-label={name}>
      <h2 className="component-entry-name">
        {name}
        <span className="component-entry-door">{door}</span>
      </h2>
      {notes}
      <div className="component-states">{children}</div>
    </section>
  );
}

// What a component is made of and how it is used (CM-7): each note is a term and a line of text.
export function ComponentNotes({ notes }: { notes: { term: string; text: string }[] }) {
  return (
    <dl className="component-notes">
      {notes.map(({ term, text }) => (
        <div key={term} className="component-note">
          <dt>{term}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled):not([type="hidden"]), select, textarea, [href], [tabindex="0"], [role="slider"]';

// A state drawn with the keyboard focus on its first control (ST-1). The ring is the one focus ring, worn
// through `data-focus-visible`, so every cell shows it at once. A state with no control shows no focus cell.
export function ComponentFocusState({ children }: { children: ReactNode }) {
  const cell = useRef<HTMLDivElement>(null);
  const [hasControl, setHasControl] = useState(true);
  useEffect(() => {
    const control = cell.current?.querySelector<HTMLElement>(FOCUSABLE);
    if (control) control.dataset.focusVisible = 'true';
    else setHasControl(false);
  }, []);
  if (!hasControl) return null;
  return (
    <div ref={cell} className="component-state">
      <span className="component-state-name">focus</span>
      {children}
    </div>
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
