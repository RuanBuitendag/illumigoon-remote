import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState, type ReactNode } from 'react';
import { FavouriteLookItem, LevelRow, LightCard, MoreRow, RoomLayout, RoomSection, SliderRow } from '../../src/composites';
import { Eyebrow, Icon, LedStrip, PowerKey } from '../../src/design-system';
import beachSunset from '../../src/domain/looks/patches/beach-sunset.json';
import candle from '../../src/domain/looks/patches/candle.json';
import coals from '../../src/domain/looks/patches/coals.json';
import oceanSwell from '../../src/domain/looks/patches/ocean-swell.json';
import starfield from '../../src/domain/looks/patches/starfield.json';
import warmWhite from '../../src/domain/looks/patches/warm-white.json';
import { useRecording } from '../../src/domain/looks/recordings';
import './prototype.css';

// UX-09 (LIFE-1880): the room screen leads with looks to tap, for Noa (P1), and the look's controls wait behind
// ADJUST, for Tess (P2). Made-up state, real recordings of the looks. Nothing here talks to a light.
// The key ranks and the power key are sketches too: change them in Controls.

type Look = { name: string; surface?: { key: string; label: string; type: string; min?: number; max?: number; step?: number; default?: unknown }[] };
const LOOKS: Look[] = [coals, candle, starfield, oceanSwell, beachSunset, warmWhite];

type Rank = 'primary' | 'secondary' | 'quiet';
type Args = { keys: 'ranked' | 'all words'; power: 'symbol' | 'switch' | 'word' | 'split'; motion: 'outline' | 'mesh' | 'still' };

function PatchStrip({ look, shape, isOn = true, brightness = 1 }: { look: Look; shape: 'tile' | 'room' | 'line'; isOn?: boolean; brightness?: number }) {
  const source = useMemo(() => ({ kind: 'patch' as const, key: `prototype-${look.name}`, document: look }), [look]);
  const recording = useRecording(source);
  return <LedStrip recording={recording ?? null} shape={shape} isOn={isOn} brightness={brightness} onFirstView={() => undefined} />;
}

function Key({ rank, keys, children, onClick }: { rank: Rank; keys: Args['keys']; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="proto-key" data-rank={keys === 'ranked' ? rank : 'quiet'} onClick={onClick}>
      {children}
    </button>
  );
}

type PowerProps = { kind: Args['power']; label: string; isOn: boolean; onChange: (next: boolean) => void };

function Power({ kind, label, isOn, onChange }: PowerProps) {
  if (kind === 'symbol') {
    return (
      <button type="button" className="proto-power-symbol" aria-label={label} aria-pressed={isOn} onClick={() => onChange(!isOn)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path className="proto-power-symbol-base" pathLength={1} d="M7.5 6.2 A8 8 0 1 0 16.5 6.2" />
          <path className="proto-power-symbol-base" pathLength={1} d="M12 2.5 V11" />
          <path className="proto-power-symbol-lit" pathLength={1} d="M7.5 6.2 A8 8 0 1 0 16.5 6.2" />
          <path className="proto-power-symbol-lit" pathLength={1} d="M12 2.5 V11" />
        </svg>
      </button>
    );
  }
  if (kind === 'switch') return <PowerKey label={label} isOn={isOn} onChange={onChange} />;
  if (kind === 'word') {
    return (
      <button type="button" className="proto-key proto-power-word" aria-label={label} aria-pressed={isOn} onClick={() => onChange(!isOn)}>
        {isOn ? 'ON' : 'OFF'}
      </button>
    );
  }
  return (
    <span className="proto-power-split" role="group" aria-label={label}>
      <button type="button" aria-pressed={!isOn} onClick={() => onChange(false)}>OFF</button>
      <button type="button" aria-pressed={isOn} onClick={() => onChange(true)}>ON</button>
    </span>
  );
}

function sliders(look: Look) {
  return (look.surface ?? []).filter(({ type }) => type === 'slider');
}

function RoomWithLooks({ keys, power, motion }: Args) {
  const [playing, setPlaying] = useState<Look>(coals);
  const [isOn, setOn] = useState(true);
  const [level, setLevel] = useState(0.7);
  const [isAdjusting, setAdjusting] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});
  const nothing = () => undefined;
  const play = (look: Look) => {
    setPlaying(look);
    setOn(true);
    setValues({});
  };
  const controls = sliders(playing);
  return (
    <div className="proto-column" data-motion={motion}>
      <RoomLayout
        name="Bedroom"
        backLabel="Rooms"
        onBack={nothing}
        power={<Power kind={power} label="Bedroom power" isOn={isOn} onChange={setOn} />}
      >
        <LevelRow label="Bedroom" isOn={isOn} level={level} disabled={!isOn} onLevel={setLevel} />
        <RoomSection
          eyebrow="LOOKS"
          action={
            <Key rank="quiet" keys={keys} onClick={nothing}>
              ALL LOOKS
              <Icon.Fwd c="currentColor" />
            </Key>
          }
        >
          <div className="proto-looks">
            {LOOKS.map((look) => (
              <FavouriteLookItem
                key={look.name}
                name={look.name}
                isPlaying={isOn && look.name === playing.name}
                strip={<PatchStrip look={look} shape="tile" />}
                onPick={() => play(look)}
                onHold={nothing}
                onHoldEnd={nothing}
              />
            ))}
          </div>
        </RoomSection>
        <RoomSection>
          <div className="proto-look-head">
            <span className="proto-look-name" key={isOn ? playing.name : 'off'}>{isOn ? playing.name : 'Off'}</span>
            {isOn && (
              <span className="proto-keys">
                <Key rank="quiet" keys={keys} onClick={nothing}>
                  EDIT
                </Key>
                <Key rank="secondary" keys={keys} onClick={() => setAdjusting(!isAdjusting)}>
                  {isAdjusting ? 'DONE' : 'ADJUST'}
                </Key>
              </span>
            )}
          </div>
          {isOn && isAdjusting && (
            <div className="proto-adjust">
            {controls.map(({ key, label, min = 0, max = 100, step = 1, default: start }) => {
              const value = values[key] ?? Number(start ?? min);
              return (
                <SliderRow
                  key={key}
                  label={label}
                  valueText={String(value)}
                  value={value}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(next) => setValues({ ...values, [key]: next })}
                />
              );
            })}
            <span className="proto-keys-end">
              <Key rank="quiet" keys={keys} onClick={() => setValues({})}>
                RESET
              </Key>
              <Key rank="primary" keys={keys} onClick={nothing}>
                SAVE AS NEW
              </Key>
            </span>
            </div>
          )}
        </RoomSection>
        <RoomSection eyebrow="LIGHTS">
          {['Left', 'Right'].map((name) => (
            <LightCard
              key={name}
              name={name}
              note=""
              isChosen={false}
              disabled={false}
              strip={<PatchStrip look={playing} shape="room" isOn={isOn} brightness={level} />}
              power={<Power kind={power} label={`${name} power`} isOn={isOn} onChange={setOn} />}
              onChoose={nothing}
              onHold={nothing}
            />
          ))}
        </RoomSection>
        <RoomSection>
          <MoreRow label="Off timer" onOpen={nothing} />
          <MoreRow label="Room settings" onOpen={nothing} />
        </RoomSection>
      </RoomLayout>
    </div>
  );
}

// The three ranks side by side, and in the place each one is for.
function KeyRanks({ keys, motion }: Args) {
  const [isOn, setOn] = useState(true);
  const nothing = () => undefined;
  return (
    <div className="proto-compare" data-motion={motion}>
      <Eyebrow>PRIMARY</Eyebrow>
      <span className="proto-keys">
        <Key rank="primary" keys={keys} onClick={nothing}>SAVE</Key>
        The one main action of a screen or sheet. One at most.
      </span>
      <Eyebrow>SECONDARY</Eyebrow>
      <span className="proto-keys">
        <Key rank="secondary" keys={keys} onClick={nothing}>ADJUST</Key>
        An action that opens or changes something here.
      </span>
      <Eyebrow>QUIET</Eyebrow>
      <span className="proto-keys">
        <Key rank="quiet" keys={keys} onClick={nothing}>CANCEL</Key>
        A way out, or a way to more.
      </span>
      <Eyebrow>IN A SHEET</Eyebrow>
      <span className="proto-keys-end proto-wide">
        <Key rank="quiet" keys={keys} onClick={nothing}>CANCEL</Key>
        <Key rank="primary" keys={keys} onClick={nothing}>SAVE</Key>
      </span>
      <Eyebrow>POWER: SWITCH (NOW)</Eyebrow>
      <span><Power kind="switch" label="Switch power" isOn={isOn} onChange={setOn} /></span>
      <Eyebrow>POWER: WORD</Eyebrow>
      <span><Power kind="word" label="Word power" isOn={isOn} onChange={setOn} /></span>
      <Eyebrow>POWER: SPLIT</Eyebrow>
      <span><Power kind="split" label="Split power" isOn={isOn} onChange={setOn} /></span>
    </div>
  );
}

export default {
  title: 'Prototypes/Room with looks first',
  parameters: { layout: 'fullscreen' },
  args: { keys: 'ranked', power: 'symbol', motion: 'outline' },
  argTypes: {
    keys: { control: 'inline-radio', options: ['ranked', 'all words'], description: 'Ranked keys, or every key as words as now' },
    power: { control: 'inline-radio', options: ['symbol', 'switch', 'word', 'split'], description: 'The power key' },
    motion: { control: 'inline-radio', options: ['outline', 'mesh', 'still'], description: 'A piece of light travels round each framed key, a band of wire mesh drifts round it, or no motion' },
  },
} satisfies Meta<Args>;

type Story = StoryObj<Args>;

export const Phone: Story = {
  render: (args) => <RoomWithLooks {...args} />,
  globals: { viewport: { value: 'phone', isRotated: false } },
};

export const Laptop: Story = {
  render: (args) => <RoomWithLooks {...args} />,
  globals: { viewport: { value: 'laptop', isRotated: false } },
};

export const Keys: Story = {
  render: (args) => <KeyRanks {...args} />,
};

// The two moving outlines side by side: a piece of light, and a band of wire mesh.
export const Motion: Story = {
  render: (args) => (
    <div className="proto-side-by-side">
      <KeyRanks {...args} motion="outline" />
      <KeyRanks {...args} motion="mesh" />
    </div>
  ),
};

// Every power key side by side, each with its own state, on the moving outline.
const POWERS: Args['power'][] = ['symbol', 'switch', 'word', 'split'];
function PowerRow({ kind }: { kind: Args['power'] }) {
  const [isOn, setOn] = useState(false);
  return (
    <>
      <Eyebrow>{kind.toUpperCase()}</Eyebrow>
      <span>
        <Power kind={kind} label={`${kind} power`} isOn={isOn} onChange={setOn} />
      </span>
    </>
  );
}
export const PowerKeys: Story = {
  render: () => (
    <div className="proto-compare" data-motion="outline">
      {POWERS.map((kind) => (
        <PowerRow key={kind} kind={kind} />
      ))}
    </div>
  ),
};
