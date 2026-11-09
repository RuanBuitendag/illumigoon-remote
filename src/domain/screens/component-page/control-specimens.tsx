import {
  ArrangeRow,
  ChoiceList,
  ColourEditor,
  ControlGroup,
  ControlList,
  DayPicker,
  HeadingRow,
  InfoRow,
  LevelRow,
  LightDragList,
  LockStatus,
  NamedSelectRow,
  NamingRow,
  EmptyState,
  PageHint,
  ScanNote,
  SelectRow,
  SliderRow,
  StepperRow,
  ToggleRow,
} from '../../../composites';
import { Eyebrow, LedStrip, PowerKey, STARTER_COLOUR_SETS, TextKey } from '../../../design-system';
import { LONG_NAME, nothing, RECORDING, SUNSET, type Specimen } from './specimen';

const slider = { label: 'Speed', valueText: '60 %', value: 0.6, min: 0, max: 1, step: 0.01, onChange: nothing };
const rooms = [
  { value: 'lounge', name: 'LOUNGE' },
  { value: 'bedroom', name: 'BEDROOM' },
];
const choices = [
  { id: 'fifteen', name: '15 minutes' },
  { id: 'hour', name: '1 hour' },
  { id: 'long', name: LONG_NAME },
];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, index) => ({ name, isOn: index < 5 }));
const sets = STARTER_COLOUR_SETS.map((set) => ({ ...set, family: 'Starter' }));
const colourEditor = { sets, canUndo: false, onStep: nothing, onUndo: nothing, onChange: nothing, onKeepSet: nothing };
const palette = { key: 'palette', label: 'Colours', isPalette: true, colours: SUNSET, minimumColours: 2 };
const ownColours = { ...palette, ownName: 'Its own colours', colours: [SUNSET[0] ?? '', SUNSET[4] ?? ''] };
const singleColour = { ...palette, key: 'one', label: 'Colour', isPalette: false, colours: SUNSET.slice(1, 2), minimumColours: 1 };
const flash = <TextKey onClick={nothing}>FLASH</TextKey>;
const strip = <LedStrip recording={RECORDING} shape="line" onFirstView={nothing} />;

const ROWS: Specimen[] = [
  {
    name: 'SliderRow',
    states: { default: <SliderRow {...slider} />, 'long text': <SliderRow {...slider} label={LONG_NAME} /> },
  },
  {
    name: 'StepperRow',
    states: { default: <StepperRow label="Lights" valueText="4" onStep={nothing} /> },
  },
  {
    name: 'SelectRow',
    states: { default: <SelectRow label="Room" options={rooms} value="lounge" onChange={nothing} /> },
  },
  {
    name: 'NamedSelectRow',
    states: {
      default: <NamedSelectRow label="Left" options={rooms} value="bedroom" onChange={nothing} />,
      'long text': <NamedSelectRow label={LONG_NAME} options={rooms} value="bedroom" onChange={nothing} />,
    },
  },
  {
    name: 'ToggleRow',
    states: {
      off: <ToggleRow label="Moves to music" isOn={false} onChange={nothing} />,
      on: <ToggleRow label="Moves to music" isOn onChange={nothing} />,
      disabled: <ToggleRow label="Moves to music" isOn disabled onChange={nothing} />,
    },
  },
  {
    name: 'HeadingRow',
    states: {
      'heading only': <HeadingRow heading={<Eyebrow>LIGHTS</Eyebrow>} />,
      'with a key': (
        <HeadingRow heading={<Eyebrow>LIGHTS</Eyebrow>}>
          <TextKey onClick={nothing}>MANAGE</TextKey>
        </HeadingRow>
      ),
    },
  },
  {
    name: 'LevelRow',
    states: {
      on: <LevelRow label="Lounge" isOn level={0.7} onPower={nothing} onLevel={nothing} />,
      off: <LevelRow label="Lounge" isOn={false} level={0.7} onPower={nothing} onLevel={nothing} />,
      'no power key': <LevelRow label="Lounge" isOn level={0.4} onLevel={nothing} />,
      disabled: <LevelRow label="Lounge" isOn level={0.7} disabled onPower={nothing} onLevel={nothing} />,
    },
  },
  {
    name: 'NamingRow',
    states: {
      'empty, KEEP disabled': <NamingRow label="Scene name" onCancel={nothing} onKeep={nothing} />,
      suggested: <NamingRow label="Scene name" suggestion="Evening" onCancel={nothing} onKeep={nothing} />,
    },
  },
];

const LISTS: Specimen[] = [
  {
    name: 'ChoiceList',
    states: {
      'one chosen': <ChoiceList label="Off timer" choices={choices} chosen={['hour']} onChoose={nothing} />,
      'several chosen': <ChoiceList label="Lights" choices={choices} chosen={['fifteen', 'long']} onChoose={nothing} />,
      empty: <ChoiceList label="Lights" choices={[]} chosen={[]} onChoose={nothing} />,
    },
  },
  {
    name: 'ControlList',
    states: {
      default: (
        <ControlList>
          <SliderRow {...slider} />
          <ToggleRow label="Moves to music" isOn onChange={nothing} />
        </ControlList>
      ),
    },
  },
  {
    name: 'ControlGroup',
    states: {
      titled: (
        <ControlGroup title="Motion">
          <SliderRow {...slider} />
        </ControlGroup>
      ),
      untitled: (
        <ControlGroup>
          <SliderRow {...slider} />
        </ControlGroup>
      ),
    },
  },
  {
    name: 'InfoRow',
    states: {
      default: <InfoRow label="Software" note="1.2.454, up to date" />,
      'opens a page': <InfoRow label="Software" note="1.2.454, up to date" onOpen={nothing} />,
      'with a key': (
        <InfoRow label="Left" note={LONG_NAME}>
          <PowerKey label="Left power" isOn onChange={nothing} />
        </InfoRow>
      ),
    },
  },
  {
    name: 'DayPicker',
    states: {
      weekdays: <DayPicker days={days} onToggle={nothing} />,
      none: <DayPicker days={days.map((day) => ({ ...day, isOn: false }))} onToggle={nothing} />,
    },
  },
  { name: 'LockStatus', states: { default: <LockStatus>Locked to this phone</LockStatus> } },
  { name: 'PageHint', states: { default: <PageHint>Hold a look to see it here first.</PageHint> } },
  {
    name: 'EmptyState',
    states: {
      'title only': <EmptyState title="No scenes yet" />,
      'with its step': (
        <EmptyState title="Nothing yet">
          <PageHint>Change a light, and it shows here.</PageHint>
        </EmptyState>
      ),
    },
  },
  { name: 'ScanNote', states: { loading: <ScanNote strip={strip}>Looking for lights on this Wi-Fi.</ScanNote> } },
  {
    name: 'ArrangeRow',
    states: {
      'with grip': <ArrangeRow name="Left" maxLength={24} hasGrip onRename={nothing} />,
      'no grip, with a key': <ArrangeRow name="Left" maxLength={24} hasGrip={false} onRename={nothing} action={flash} />,
      'long text': <ArrangeRow name={LONG_NAME} maxLength={120} hasGrip onRename={nothing} />,
    },
  },
  {
    name: 'LightDragList',
    states: {
      'drag by the grip': (
        <LightDragList ids={['left', 'right']} onOrder={nothing}>
          <ArrangeRow name="Left" maxLength={24} hasGrip onRename={nothing} />
          <ArrangeRow name="Right" maxLength={24} hasGrip onRename={nothing} />
        </LightDragList>
      ),
    },
  },
  {
    name: 'ColourEditor',
    states: {
      palette: <ColourEditor {...colourEditor} fields={[palette]} />,
      'own colours, can undo': <ColourEditor {...colourEditor} canUndo fields={[ownColours]} />,
      'single colours': <ColourEditor {...colourEditor} fields={[singleColour]} />,
      'no fields': <ColourEditor {...colourEditor} fields={[]} />,
    },
  },
];

export const CONTROLS = [...ROWS, ...LISTS];
