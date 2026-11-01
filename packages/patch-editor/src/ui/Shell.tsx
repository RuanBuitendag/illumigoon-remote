/**
 * The frame every view stands in: one top bar, the patch rail down the left, the view beside it.
 *
 * ONE APP, NOT TWO SCREENS. The house and a light's editor were separate screens with separate top
 * bars, and once a light was open there was no way back to the house short of the light failing.
 * Now both are views inside this: the trail says where you are and takes you back, the switcher
 * moves between lights without going through the house, and the rail stays put across all of it.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { roomsOf, selectable, type Light } from '../domain/house';
import { Blurb, Ico, Lab, Mono } from './bits';
import type { HouseFeed } from './houseFeed';

export function Shell({
  onClose,
  trail,
  notice,
  warn = false,
  tools,
  rail,
  railShut,
  onToggleRail,
  children,
}: {
  /** Back to the app the editor opened from. */
  onClose(): void;
  trail: ReactNode;
  notice?: string | null;
  /** The notice is a problem, not news. */
  warn?: boolean;
  tools: ReactNode;
  rail: ReactNode;
  railShut: boolean;
  onToggleRail(): void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="topbar">
        <div className="row" style={{ gap: 16, minWidth: 0 }}>
          {/* First in the bar, above the rail it hides: the one place it can always be found
              again. */}
          <button
            className="iconbtn raise"
            onClick={onToggleRail}
            aria-pressed={!railShut}
            title={railShut ? 'Show the library' : 'Hide the library'}
          >
            <Ico.Rail c={railShut ? 'var(--text-5)' : 'var(--text-3)'} />
          </button>
          <button className="crumb" onClick={onClose} title="Close the editor">Done</button>
          <span className="editor-wordmark">ILLUMIGOON</span>
          <span className="topsep" />
          {trail}
          {notice && (
            <span className={warn ? 'warnline' : 'housenotice'} title={notice}>
              {notice}
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 14, flexShrink: 0 }}>
          {tools}
        </div>
      </div>
      <div className="shellbody">
        {rail}
        <div className="shellmain">{children}</div>
      </div>
    </>
  );
}

/**
 * Where you are: the house, or a light inside it.
 *
 * In the house, `House` is the page you are on and says how many lights it can see. With a light
 * open, `House` is the way back -- closing that light's socket, as leaving always did -- and the
 * light's own name opens the switcher.
 */
export function Trail({ view, feed, currentId, label, extra, onHouse, onLight }: {
  view: 'house' | 'light';
  feed: HouseFeed;
  /** The open light's MAC, once the feed has found it. */
  currentId: string | null;
  /** What the open light is called, before the feed has found it. */
  label: string;
  /** Beside the light's chip: master, firmware. */
  extra?: ReactNode;
  onHouse(): void;
  onLight(light: Light): void;
}) {
  const rooms = feed.rooms.filter(r => r.name).length;
  const status = !feed.reachable
    ? 'discovery sidecar not running — npm run dev'
    : feed.lights.length
      ? `${feed.lights.length} light${feed.lights.length === 1 ? '' : 's'} · ${rooms} ` +
        `room${rooms === 1 ? '' : 's'}`
      : 'listening for _modulight._tcp';

  if (view === 'house') {
    return (
      <div className="row trail">
        <span className="crumb on">House</span>
        <Mono className="dim">{status}</Mono>
      </div>
    );
  }

  return (
    <div className="row trail">
      <button
        className="crumb"
        onClick={onHouse}
        title="Back to every light — closes this light's editor"
      >
        House
      </button>
      <span className="crumbsep">›</span>
      <LightSwitcher lights={feed.lights} currentId={currentId} label={label} onLight={onLight} />
      {extra}
    </div>
  );
}

/** The open light, and every other one a click away. Closes on a click anywhere else. */
function LightSwitcher({ lights, currentId, label, onLight }: {
  lights: Light[];
  currentId: string | null;
  label: string;
  onLight(light: Light): void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const current = lights.find(l => l.id === currentId);

  return (
    <div className="switcher" ref={box}>
      <button
        className="row raise switchchip"
        onClick={() => setOpen(o => !o)}
        title="Switch to another light"
      >
        <span className="livedot" data-on="true" />
        <span className="switchname">{current?.name ?? label}</span>
        {current?.room && (
          <>
            <span style={{ color: 'var(--text-5)' }}>/</span>
            <span style={{ font: '400 12px/1 var(--sans)', color: 'var(--text-3)' }}>
              {current.room}
            </span>
          </>
        )}
        <Ico.Chev />
      </button>
      {open && (
        <div className="switchmenu raise-hi">
          {!lights.length && <Blurb>No lights found on the network.</Blurb>}
          {roomsOf(lights).map(room => (
            <div key={room.name ?? '—'} className="col" style={{ gap: 2 }}>
              <div className="switchroom">
                <Lab className="dim">{room.name ?? 'No room yet'}</Lab>
              </div>
              {room.lights.map(l => {
                const here = l.id === currentId;
                return (
                  <button
                    key={l.id}
                    className="switchrow"
                    data-on={here}
                    disabled={here || !selectable(l)}
                    title={selectable(l) ? l.id : 'Not answering'}
                    onClick={() => {
                      setOpen(false);
                      onLight(l);
                    }}
                  >
                    <span className="livedot" data-on={selectable(l)} />
                    <span className="grow">{l.name}</span>
                    {here && <Mono className="dim sm">open</Mono>}
                    {!here && !selectable(l) && <Mono className="dim sm">silent</Mono>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Open a light mDNS never found, by address. */
export function AddressOpen({ onOpen }: { onOpen(url: string, label: string): void }) {
  const [manual, setManual] = useState('');
  const go = () => {
    const v = manual.trim();
    if (v) onOpen(v.startsWith('ws://') ? v : `ws://${v}/ws`, v);
  };
  return (
    <>
      <div className="well addr" title="Open a light mDNS has not found">
        <Mono className="dim">ws://</Mono>
        <input value={manual} placeholder="address" spellCheck={false}
               onChange={e => setManual(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') go(); }} />
        <Mono className="dim">/ws</Mono>
      </div>
      <button className="pill raise" disabled={!manual.trim()} onClick={go}>OPEN</button>
    </>
  );
}
