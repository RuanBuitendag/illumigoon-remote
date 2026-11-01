/**
 * Scenes: named arrangements of the whole house, kept on this laptop (LIFE-863).
 *
 * THE SAVE ROW SHOWS WHAT IT WILL KEEP before anything is written: how many lights, and how many
 * it cannot describe. `capture` asks the lights nothing — it takes what the sidecar last heard —
 * so what the row shows is exactly what the file gets (ADR 0023). A light that is not answering,
 * or never said what it is running, is left out and counted rather than guessed.
 *
 * A NAME ALREADY USED IS REPLACED IN PLACE, and the button says REPLACE as the name is typed —
 * the rule the app's save sheet follows.
 *
 * Applying is the screen's to do (it holds the port and the arrival); this rail only says which.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { capture, sceneCounts, type Light, type Scene, type SceneLight } from '../domain/house';
import {
  deleteScene,
  listScenes,
  sceneFileFor,
  writeScene,
  type SceneEntry,
} from '../library/scenes';
import { Ico, Lab, Mono } from './bits';
import { LedStrip } from './LedStrip';

/** A scene's lights by room, in the order they were captured. */
function byRoom(scene: Scene): [string, SceneLight[]][] {
  const rooms = new Map<string, SceneLight[]>();
  for (const l of scene.lights) {
    const k = l.room ?? 'no room';
    (rooms.get(k) ?? rooms.set(k, []).get(k)!).push(l);
  }
  return [...rooms];
}

export function ScenesRail({ lights, onApply }: {
  lights: Light[];
  onApply(scene: Scene): Promise<void>;
}) {
  const [scenes, setScenes] = useState<SceneEntry[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  /** The file whose delete is one more click away. */
  const [armed, setArmed] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(() => {
    listScenes()
      .then(s => { setScenes(s); setProblem(null); })
      .catch((e: Error) => setProblem(e.message));
  }, []);
  useEffect(reload, [reload]);

  const draft = useMemo(() => (naming === null ? null : capture(naming, lights)), [naming, lights]);
  const replacing = !!naming?.trim() && !!scenes?.some(s => s.file === sceneFileFor(naming.trim()));

  const keep = async () => {
    if (!draft || !naming?.trim() || !draft.scene.lights.length) return;
    try {
      await writeScene(sceneFileFor(naming.trim()), {
        ...draft.scene,
        created: new Date().toISOString(),
      });
      setNaming(null);
      reload();
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const apply = async (s: SceneEntry) => {
    setBusy(s.file);
    try { await onApply(s); } finally { setBusy(null); }
  };

  const remove = async (s: SceneEntry) => {
    if (armed !== s.file) { setArmed(s.file); return; }
    setArmed(null);
    try { await deleteScene(s.file); reload(); } catch (e) { setProblem((e as Error).message); }
  };

  return (
    <div className="panel houserail right">
      <div className="panelhead" style={{ height: 40, paddingRight: 10 }}>
        <Lab className="head">Scenes</Lab>
        {naming === null && (
          <button
            className="pill"
            style={{ padding: '7px 10px' }}
            onClick={() => setNaming('')}
            title="Keep what every light is showing now, under a name"
          >
            <span className="row" style={{ gap: 8 }}>
              <Ico.Plus c="var(--text-3)" s={10} />
              SAVE THE HOUSE
            </span>
          </button>
        )}
      </div>
      <div className="hr" />
      <div className="scroll col houselist">
        {naming !== null && draft && (
          <SceneSave
            naming={naming}
            setNaming={setNaming}
            draft={draft}
            replacing={replacing}
            keep={keep}
          />
        )}

        {problem && <div className="libempty">{problem}</div>}
        {!problem && scenes && !scenes.length && naming === null && (
          <div className="libempty">
            No scenes yet. Put the house how you want it, then save it here.
          </div>
        )}

        {scenes?.map(s => {
          if (s.error) {
            return (
              <div key={s.file} className="flatcard scenecard">
                <span className="scenename">{s.name ?? s.file}</span>
                <span className="tilenote warn">{s.error}</span>
              </div>
            );
          }
          const { on, off } = sceneCounts(s);
          return (
            <div key={s.file} className="flatcard scenecard">
              <div className="row" style={{ gap: 10 }}>
                <span className="scenename">{s.name}</span>
                <span className="grow" />
                <Mono className="dim sm">{off ? `${on} on · ${off} off` : `${on} on`}</Mono>
              </div>
              {byRoom(s).map(([room, ls]) => (
                <div key={room} className="sceneroom">
                  <Lab>{room}</Lab>
                  <div className="leds">
                    {ls.map(l => (
                      <LedStrip
                        key={l.id}
                        animation={l.animation}
                        height={18}
                        dim={!l.is_on}
                        live={false}
                        title={`${l.name}${l.is_on ? '' : ' — off'}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="row" style={{ gap: 8, paddingTop: 2 }}>
                {off > 0 && <span className="tilenote warn">switches {off} off</span>}
                <span className="grow" />
                <button
                  className="pill"
                  style={{ padding: '8px 10px' }}
                  onClick={() => void remove(s)}
                  title="Delete this scene from the folder"
                >
                  {armed === s.file ? 'DELETE?' : <Ico.X c="var(--text-4)" />}
                </button>
                <button
                  className="pill"
                  data-primary="true"
                  style={{ padding: '8px 14px' }}
                  disabled={busy !== null}
                  onClick={() => void apply(s)}
                >
                  {busy === s.file ? 'APPLYING…' : 'APPLY'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The row that names the house as it stands, before the scene is kept. */
function SceneSave({ naming, setNaming, draft, replacing, keep }: {
  naming: string; setNaming(name: string | null): void;
  draft: ReturnType<typeof capture>; replacing: boolean; keep(): Promise<void>;
}) {
  return (
    <div className="raise scenesave">
      <input
        className="well"
        autoFocus
        value={naming}
        placeholder="Evening"
        spellCheck={false}
        onChange={e => setNaming(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') void keep();
          if (e.key === 'Escape') setNaming(null);
        }}
      />
      <div className="row" style={{ gap: 8 }}>
        <Mono className="dim sm">
          {draft.scene.lights.length} light{draft.scene.lights.length === 1 ? '' : 's'}
        </Mono>
        {draft.unknown.length > 0 && (
          <span className="tilenote warn" title={draft.unknown.map(l => l.name).join(', ')}>
            {draft.unknown.length} unknown
          </span>
        )}
        <span className="grow" />
        <button
          className="pill"
          style={{ padding: '8px 10px' }}
          onClick={() => setNaming(null)}
        >
          CANCEL
        </button>
        <button
          className="pill"
          data-primary="true"
          style={{ padding: '8px 14px' }}
          disabled={!naming.trim() || !draft.scene.lights.length}
          onClick={() => void keep()}
        >
          {replacing ? 'REPLACE' : 'KEEP'}
        </button>
      </div>
    </div>
  );
}
