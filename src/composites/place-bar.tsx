import type { ReactNode } from 'react';
import { Eyebrow, Press, TextField } from '../design-system';
import { Sheet, SheetBody } from './sheet';

type PlaceKey<Value extends string> = { value: Value; name: string; icon: ReactNode; disabled?: boolean };

type PlaceBarProps<Value extends string> = {
  places: PlaceKey<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  // A long press on any key opens the jump sheet.
  onHold: () => void;
};

// The four places of the app, one tap each, with a line icon over each word (LIFE-1964, option B).
export function PlaceBar<Value extends string>({ places, value, onChange, onHold }: PlaceBarProps<Value>) {
  return (
    <nav className="place-bar" aria-label="Places">
      {places.map((place) => (
        <Press
          key={place.value}
          className="place-key"
          isPressed={place.value === value}
          disabled={place.disabled}
          onClick={() => onChange(place.value)}
          onHold={onHold}
        >
          {place.icon}
          <span>{place.name}</span>
        </Press>
      ))}
    </nav>
  );
}

type PlaceFrameProps = { bar: ReactNode; children: ReactNode };

// The screens stand above the bar, so the bar never covers a row.
export function PlaceFrame({ bar, children }: PlaceFrameProps) {
  return (
    <div className="place-frame">
      {children}
      {bar}
    </div>
  );
}

type PlaceViewProps = { isShown: boolean; isPage?: boolean; children: ReactNode };

// A place that is not shown stays, so it is where it was left when it comes back.
export function PlaceView({ isShown, isPage, children }: PlaceViewProps) {
  return (
    <div className={isPage ? 'place-view place-page' : 'place-view'} data-shown={isShown} inert={!isShown}>
      {children}
    </div>
  );
}

type JumpHit = { id: string; name: string; detail: string; onPick: () => void };
export type JumpGroup = { title: string; hits: JumpHit[] };

type JumpSheetProps = {
  query: string;
  groups: JumpGroup[];
  empty: string;
  onQuery: (query: string) => void;
  onClose: () => void;
};

// A few letters find a room or a look, and a tap goes there.
export function JumpSheet({ query, groups, empty, onQuery, onClose }: JumpSheetProps) {
  const shown = groups.filter(({ hits }) => hits.length > 0);
  return (
    <Sheet label="Go to" onClose={onClose}>
      {(close) => (
        <SheetBody>
          <TextField size="large" label="Find a room or a look" value={query} onChange={onQuery} />
          {shown.length === 0 && <p className="note">{empty}</p>}
          {shown.map(({ title, hits }) => (
            <section key={title} className="jump-group">
              <Eyebrow>{title}</Eyebrow>
              {hits.map(({ id, name, detail, onPick }) => (
                <Press
                  key={id}
                  className="jump-hit"
                  onClick={() => {
                    onPick();
                    close();
                  }}
                >
                  <span>{name}</span>
                  <span className="note">{detail}</span>
                </Press>
              ))}
            </section>
          ))}
        </SheetBody>
      )}
    </Sheet>
  );
}
