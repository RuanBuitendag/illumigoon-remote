/**
 * The house view: every light on the network, what is about to be sent to which, and the Scenes
 * kept on this laptop (LIFE-863). The patch comes from the rail beside it, and a light's arrow
 * opens
 * that light's editor in this same frame (`Shell`).
 *
 * THE VIEW PLANS; IT DOES NOT SEND. Every act here is a plan from `domain/house.ts` handed to the
 * `house` port the composition root passes in, because a component may not import the device
 * (`check:layers`). What it knows about each light arrives through the one feed `App.tsx` polls.
 *
 * SELECTION IS BY LIGHT, NOT BY ROOM. A room's box is a shortcut for its lights, and a light that
 * is
 * not answering cannot be chosen: nothing is queued for it.
 *
 * THE ARRIVAL IS NOT THIS VIEW'S. It is the one choice `App.tsx` holds (`ui/arrival.tsx`), so a
 * patch
 * sent from here and a preset loaded onto a light arrive the same way.
 */

import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import {
  applyScene, arrivalOf, deliveryNote, documentOf, makeOwnArrival, ownArrivalOf, putPatch,
  roomChoice, selectable, toggleLight, toggleRoom,
  type Animation, type HousePort, type Light, type Scene,
} from '../domain/house';
import { ArrivalPick, type ArrivalChoice } from './arrival';
import { Ico, Lab, Mono } from './bits';
import type { HouseFeed } from './houseFeed';
import { LedStrip } from './LedStrip';
import type { Chosen } from './PatchRail';
import { ScenesRail } from './ScenesRail';

/** Long enough for the light to have applied it; the probe it triggers takes the rest. */
const PROBE_AFTER_SEND_MS = 1200;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const quiet = (ms: number) =>
  ms < 90_000 ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / 60_000)} min`;

const Check = ({ state }: { state: 'all' | 'some' | 'none' | 'dead' }) => (
  <span className="check" data-state={state}>
    {state === 'all' && (
      <svg
        width="9"
        height="9"
        viewBox="0 0 12 12"
        fill="none"
        stroke="var(--background)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 6.2l2.2 2.2 4.8-5" />
      </svg>
    )}
  </span>
);

export function House({ feed, port, arrival: choice, chosen, onOpen, onNotice }: {
  feed: HouseFeed;
  port: HousePort;
  arrival: ArrivalChoice;
  /** The patch the rail has chosen to send. */
  chosen: Chosen | null;
  onOpen(url: string, label: string): void;
  onNotice(notice: string): void;
}) {
  const { lights, rooms, transitions, reachable } = feed;
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [sending, setSending] = useState(false);

  const targets = useMemo(
    () => lights.filter(l => picked.has(l.id) && selectable(l)),
    [lights, picked],
  );
  const answering = lights.filter(selectable);

  const arrival = arrivalOf(choice, transitions);
  const nameOf = (id: string) => transitions?.list.find(t => t.id === id)?.name ?? id;

  // What "the light's own" is, for the lights a send would reach — or every answering one.
  const own = ownArrivalOf(targets.length ? targets : answering);
  const ownLabel = own === 'mixed' ? "Each light's own — they differ"
    : own ? `The light's own — ${nameOf(own.id)}, ${own.ms} ms`
    : "The light's own";

  const after: Animation | null = useMemo(
    () => (chosen ? { type: 'patch', params: documentOf(chosen.doc) } : null), [chosen]);

  const confirmSoon = useCallback(() => {
    setTimeout(() => void feed.refresh(true), PROBE_AFTER_SEND_MS);
  }, [feed]);

  const send = async () => {
    if (!chosen || !targets.length || sending) return;
    setSending(true);
    try {
      const d = await port.send(putPatch(chosen.doc, targets, arrival));
      onNotice(`${chosen.name} — ${deliveryNote(d)}`);
    } finally {
      setSending(false);
      confirmSoon();
    }
  };

  const keepAsOwn = async () => {
    if (!arrival || !targets.length || sending) return;
    setSending(true);
    try {
      const d = await port.send(makeOwnArrival(targets, arrival));
      onNotice(`${nameOf(arrival.id)}, ${arrival.ms} ms kept as their own — ${deliveryNote(d)}`);
    } finally {
      setSending(false);
      confirmSoon();
    }
  };

  const apply = async (scene: Scene) => {
    const plan = applyScene(scene, lights, arrival);
    const d = plan.sends.length ? await port.send(plan.sends) : [];
    onNotice(`${scene.name} — ${deliveryNote(d, plan.missing)}`);
    confirmSoon();
  };

  const flash = async (light: Light) => {
    const d = await port.flash(light);
    if (d.outcome === 'unreachable') onNotice(`${light.name} did not answer`);
  };

  return (
    <div className="housebody">
      <div className="housecentre">
        <SendBar
          chosen={chosen}
          after={after}
          choice={choice}
          transitions={transitions}
          ownLabel={ownLabel}
          arrival={arrival}
          reach={targets.length}
          answering={answering.length}
          sending={sending}
          onSend={() => void send()}
          onKeep={() => void keepAsOwn()}
        />

        {lights.length === 0 && (
          <div className="libempty">
            {reachable
              ? 'Nothing announcing yet.'
              : 'Start the sidecar, or open a light by address above.'}
          </div>
        )}

        <div className="rooms">
          {rooms.map(room => {
            const span = Math.min(4, room.lights.length);
            const inRoom = room.lights.filter(l => picked.has(l.id) && selectable(l)).length;
            return (
              <div key={room.name ?? '—'} className="room" style={{ gridColumn: `span ${span}` }}>
                <div className="roomhead" onClick={() => setPicked(toggleRoom(room, picked))}>
                  <Check state={roomChoice(room, picked)} />
                  <span className="roomname">{room.name ?? 'No room yet'}</span>
                  <Mono className="dim sm">
                    {inRoom} of {room.lights.length}
                  </Mono>
                  <span className="roomrule" />
                </div>
                <div
                  className="tiles"
                  style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}
                >
                  {room.lights.map(light => (
                    <Tile
                      key={light.id}
                      light={light}
                      on={picked.has(light.id) && selectable(light)}
                      after={after}
                      nameOf={nameOf}
                      onToggle={() => setPicked(toggleLight(light.id, picked))}
                      onFlash={() => void flash(light)}
                      onOpen={() => onOpen(light.url, light.name)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ScenesRail lights={lights} onApply={apply} />
    </div>
  );
}

function TileNow({ light, on }: { light: Light; on: boolean }) {
  if (light.heardAt === null) return <span className="tilenote">asking…</span>;
  if (light.silentFor !== null) return <div className="led silent" style={{ height: 5 }} />;
  if (light.animation?.type === 'patch') {
    return <LedStrip animation={light.animation} height={24} dim={on || light.isOn === false} />;
  }
  if (light.animation) return <span className="tilenote">{light.animation.type}</span>;
  return (
    <span className="tilenote" title="The light has not said what it is running">
      not described
    </span>
  );
}

function TileNext({ light, on, after }: { light: Light; on: boolean; after: Animation | null }) {
  if (light.silentFor !== null) {
    return <span className="tilenote warn">not answering · {quiet(light.silentFor)}</span>;
  }
  if (!on) return <span className="tilenote">stays as it is</span>;
  if (after) return <LedStrip animation={after} height={24} glow />;
  return <span className="tilenote">pick a patch</span>;
}

function aboutLight(light: Light, nameOf: (id: string) => string): string {
  return [
    light.name,
    light.id,
    light.isMaster ? 'master of this room' : null,
    light.firmware ? `fw ${light.firmware}` : null,
    light.ownArrival
      ? `arrives by ${nameOf(light.ownArrival.id)}, ${light.ownArrival.ms} ms unless told otherwise`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Tile({ light, on, after, nameOf, onToggle, onFlash, onOpen }: {
  light: Light;
  on: boolean;
  after: Animation | null;
  nameOf(id: string): string;
  onToggle(): void;
  onFlash(): void;
  onOpen(): void;
}) {
  const can = selectable(light);
  const stop = (fn: () => void) => (e: MouseEvent) => { e.stopPropagation(); fn(); };

  const about = aboutLight(light, nameOf);

  return (
    <div
      className={`tile ${on ? 'raise-hi' : 'flatcard'}`}
      data-dead={!can}
      onClick={() => can && onToggle()}
    >
      <div className="row" style={{ gap: 9 }}>
        <Check state={!can ? 'dead' : on ? 'all' : 'none'} />
        <span className="tilename" title={about}>
          {light.name}
        </span>
        {/* A mark, not a label: a word here took the room a name like "Front Right" needs. */}
        {light.isMaster && <span className="masterdot" title="Master of this room" />}
        {light.locked && (
          <span
            className="tilenote warn"
            title="Somebody holds a Lock — writes from here are dropped"
          >
            locked
          </span>
        )}
        <span className="grow" />
        <button
          className="iconbtn sm"
          title="Flash this light"
          disabled={!can}
          onClick={stop(onFlash)}
        >
          <Ico.Flash />
        </button>
        <button className="iconbtn sm" title="Open this light's editor" onClick={stop(onOpen)}>
          <Ico.Open />
        </button>
      </div>
      <div className="tileline">
        <Lab>Now</Lab>
        <TileNow light={light} on={on} />
        {light.isOn === false && can && <Mono className="dim sm">off</Mono>}
      </div>
      <div className="tileline">
        <Lab className={on ? 'mid' : ''}>After</Lab>
        <TileNext light={light} on={on} after={after} />
      </div>
    </div>
  );
}

/** What is about to go out, how it arrives, and how many lights it reaches. */
function SendBar({
  chosen, after, choice, transitions, ownLabel, arrival, reach, answering, sending,
  onSend, onKeep,
}: {
  chosen: Chosen | null;
  after: Animation | null;
  choice: ArrivalChoice;
  transitions: HouseFeed['transitions'];
  ownLabel: string;
  arrival: ReturnType<typeof arrivalOf>;
  reach: number;
  answering: number;
  sending: boolean;
  onSend(): void;
  onKeep(): void;
}) {
  return (
    <div className="raise sendbar">
      <div className="col" style={{ gap: 10, width: 190, flexShrink: 0 }}>
        <Lab>Sending</Lab>
        <span className={`sendname${chosen ? '' : ' none'}`}>
          {chosen?.name ?? 'Pick a patch on the left'}
        </span>
        <LedStrip animation={after} height={24} glow />
      </div>
      <span className="vr" />
      <div className="col" style={{ gap: 10 }}>
        <Lab>Arrives by</Lab>
        <div className="row" style={{ gap: 10 }}>
          <ArrivalPick
            choice={choice}
            transitions={transitions}
            ownLabel={ownLabel}
            title={transitions ? undefined : 'No light has described its transitions yet'}
          />
          {arrival && (
            <button
              className="pill"
              style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}
              disabled={!reach || sending}
              onClick={onKeep}
              title={
                'Store this arrival on the chosen lights, for every change nobody names one ' +
                'for — an audio swap, the restore at boot, a phone that chose nothing'
              }
            >
              MAKE IT THEIR OWN
            </button>
          )}
        </div>
      </div>
      <span className="grow" />
      <div className="col" style={{ gap: 10, alignItems: 'flex-end' }}>
        <Mono className="dim">
          {reach} of {plural(answering, 'light')}
        </Mono>
        <button
          className="pill"
          data-primary="true"
          disabled={!chosen || !reach || sending}
          onClick={onSend}
        >
          {sending ? 'SENDING…' : `SEND TO ${plural(reach, 'LIGHT').toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
