import {
  LightCard,
  LockNote,
  LookElsewhere,
  LookGroup,
  LookHeading,
  LookItem,
  LookList,
  LookPreset,
  LookProblem,
  LookSearch,
  MoreRow,
  QuietNote,
  RecentLookItem,
  RecentLooks,
  RoomCard,
  RoomDragList,
  RoomSection,
  SceneCard,
  SceneLine,
  SceneShelf,
  StateCard,
  StateList,
  WhichLine,
} from '../../../composites';
import { LedStrip, PowerKey, TextKey } from '../../../design-system';
import { LONG_NAME, nothing, RECORDING, type Specimen } from './specimen';

const strip = <LedStrip recording={RECORDING} shape="line" onFirstView={nothing} />;
const tile = <LedStrip recording={RECORDING} shape="tile" onFirstView={nothing} />;
const hold = { onPick: nothing, onHold: nothing, onHoldEnd: nothing };
const look = { ...hold, name: 'Candle', hasSound: false, isPlaying: false, strip };
const power = <PowerKey label="Lounge power" isOn onChange={nothing} />;
const lights = [
  { id: 'left', name: 'Left', state: null },
  { id: 'right', name: 'Right', state: 'silent' as const },
];
const card = {
  name: 'Lounge',
  strip,
  lookName: 'Candle',
  hasSound: false,
  power,
  lightStates: lights,
  note: null,
  hasLooks: false,
  isOpen: false,
  onOpen: nothing,
  onLooks: nothing,
  children: null,
};
const lightCard = { name: 'Left', note: '', isChosen: false, disabled: false, strip, power, onChoose: nothing, onHold: nothing };
const scene = {
  name: 'Evening',
  isEditing: false,
  onApply: nothing,
  onHold: nothing,
  onHoldEnd: nothing,
  onUpdate: nothing,
  onRename: nothing,
  onDelete: nothing,
  children: tile,
};
const shelf = { title: 'SCENES', hasScenes: true, isEditing: false, note: null, onEdit: nothing, onSave: nothing };
const fetchKey = <TextKey onClick={nothing}>FETCH</TextKey>;

const LOOKS: Specimen[] = [
  {
    name: 'LookItem',
    states: {
      default: <LookItem {...look} description="A warm flicker." />,
      playing: <LookItem {...look} isPlaying hasSound />,
      disabled: <LookItem {...look} disabled note="Plays on Left only" />,
      'long text': <LookItem {...look} name={LONG_NAME} description={LONG_NAME} />,
      'with keys': <LookItem {...look} actions={<TextKey onClick={nothing}>RENAME</TextKey>} />,
    },
  },
  {
    name: 'LookList',
    states: {
      default: (
        <LookList search="">
          <LookItem {...look} />
          <LookItem {...look} name="Starfield" />
        </LookList>
      ),
    },
  },
  {
    name: 'LookGroup',
    states: {
      default: (
        <LookGroup title="Mine" note="Plays on every light" action={<TextKey onClick={nothing}>MANAGE</TextKey>}>
          <LookItem {...look} />
        </LookGroup>
      ),
      empty: (
        <LookGroup title="Mine">
          <LookProblem>No looks of your own yet.</LookProblem>
        </LookGroup>
      ),
    },
  },
  {
    name: 'LookPreset',
    states: {
      default: <LookPreset {...hold} name="Candle" place="LOUNGE" isPlaying={false} />,
      playing: <LookPreset {...hold} name="Candle" place="LOUNGE" isPlaying action={<TextKey onClick={nothing}>EDIT</TextKey>} />,
    },
  },
  {
    name: 'LookElsewhere',
    states: { default: <LookElsewhere name="Aurora" description="Published, not in this folder." action={fetchKey} /> },
  },
  { name: 'LookProblem', states: { error: <LookProblem>This look could not be read: the file is broken.</LookProblem> } },
  {
    name: 'LookSearch',
    states: { empty: <LookSearch value="" onChange={nothing} />, typed: <LookSearch value="cand" onChange={nothing} /> },
  },
  {
    name: 'RecentLookItem',
    states: { default: <RecentLookItem {...hold} name="Candle" strip={strip} />, 'long text': <RecentLookItem {...hold} name={LONG_NAME} strip={strip} /> },
  },
  {
    name: 'RecentLooks',
    states: {
      default: (
        <RecentLooks>
          <RecentLookItem {...hold} name="Candle" strip={strip} />
          <RecentLookItem {...hold} name="Starfield" strip={strip} />
        </RecentLooks>
      ),
    },
  },
  { name: 'WhichLine', states: { default: <WhichLine text="Plays on Left and Right" onClick={nothing} /> } },
  {
    name: 'LookHeading',
    states: {
      'every key': <LookHeading name="Candle" onReset={nothing} onEdit={nothing} onLooks={nothing} />,
      'looks only': <LookHeading name={LONG_NAME} onLooks={nothing} />,
    },
  },
];

const ROOMS: Specimen[] = [
  {
    name: 'RoomCard',
    states: {
      default: <RoomCard {...card} />,
      open: <RoomCard {...card} isOpen hasSound />,
      'not answered yet': <RoomCard {...card} lookName="" onOpen={undefined} onLooks={undefined} note="Waiting for the lights." />,
      'held by someone else': <RoomCard {...card} name={LONG_NAME} onLooks={undefined} note="Locked by another phone." />,
    },
  },
  {
    name: 'RoomDragList',
    states: {
      'hold a card to drag': (
        <RoomDragList ids={['lounge', 'bedroom']} onOrder={nothing}>
          <RoomCard {...card} />
          <RoomCard {...card} name="Bedroom" />
        </RoomDragList>
      ),
    },
  },
  {
    name: 'QuietNote',
    states: { default: <QuietNote>Right does not answer.</QuietNote> },
  },
  {
    name: 'LockNote',
    states: { default: <LockNote text="Locked to this phone" actionLabel="Unlock" onAction={nothing} /> },
  },
  {
    name: 'LightCard',
    states: {
      default: <LightCard {...lightCard} />,
      chosen: <LightCard {...lightCard} isChosen note="Plays Candle" />,
      disabled: <LightCard {...lightCard} disabled note="Does not answer" />,
      'long text': <LightCard {...lightCard} name={LONG_NAME} />,
    },
  },
  {
    name: 'RoomSection',
    states: {
      titled: (
        <RoomSection eyebrow="LIGHTS" action={<TextKey onClick={nothing}>ALL</TextKey>}>
          <QuietNote>The section holds what is under its title.</QuietNote>
        </RoomSection>
      ),
      untitled: (
        <RoomSection>
          <QuietNote>No title.</QuietNote>
        </RoomSection>
      ),
    },
  },
  {
    name: 'MoreRow',
    states: { default: <MoreRow label="Room settings" onOpen={nothing} />, 'with a note': <MoreRow label="Schedules" note="2 on" onOpen={nothing} /> },
  },
  { name: 'SceneLine', states: { default: <SceneLine name="Evening" strip={strip} /> } },
  {
    name: 'SceneCard',
    states: {
      default: <SceneCard {...scene} />,
      current: <SceneCard {...scene} isCurrent />,
      editing: <SceneCard {...scene} isEditing />,
    },
  },
  {
    name: 'StateCard',
    states: { default: <StateCard {...scene} name="Yesterday 21:40" summary="3 lights, Candle" onKeep={nothing} /> },
  },
  {
    name: 'StateList',
    states: {
      default: (
        <StateList>
          <StateCard {...scene} name="Yesterday 21:40" summary="3 lights, Candle" onKeep={nothing} />
        </StateList>
      ),
    },
  },
  {
    name: 'SceneShelf',
    states: {
      default: (
        <SceneShelf {...shelf} current={{ text: 'Evening', isChanged: false }} onRecent={nothing}>
          <SceneCard {...scene} />
        </SceneShelf>
      ),
      changed: (
        <SceneShelf {...shelf} current={{ text: 'Evening, changed', isChanged: true }} onUpdate={nothing}>
          <SceneCard {...scene} isCurrent />
        </SceneShelf>
      ),
      empty: (
        <SceneShelf {...shelf} hasScenes={false} note="Save the room as it is to come back to it.">
          {null}
        </SceneShelf>
      ),
    },
  },
];

export const LOOK_AND_ROOM_PARTS = [...LOOKS, ...ROOMS];
