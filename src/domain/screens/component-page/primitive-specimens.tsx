import type { ComponentType, ReactNode } from 'react';
import { PaintSample } from '../../../composites';
import {
  ActionKey,
  AddKey,
  BackKey,
  BLACK_HEX,
  ColourPad,
  ColourSlot,
  Dialog,
  Eyebrow,
  Fader,
  FaderBand,
  FaderDot,
  FileKey,
  gradientOf,
  hexToColour,
  Icon,
  IconFrame,
  KeyRow,
  LedStrip,
  LinkKey,
  OptionRow,
  Picked,
  PowerKey,
  Press,
  SoundMark,
  StatusMark,
  Swatch,
  TextArea,
  TextField,
  TextKey,
  ValueText,
} from '../../../design-system';
import { LONG_NAME, nothing, OnDemand, RECORDING, SUNSET, type Specimen } from './specimen';

const fader = { label: 'Brightness', value: 0.6, min: 0, max: 1, step: 0.01, onChange: nothing };
const options = [
  { value: 'slow', name: 'SLOW' },
  { value: 'medium', name: 'MEDIUM' },
  { value: 'fast', name: 'FAST' },
];
const colour = SUNSET[2] ?? BLACK_HEX;
const field = { label: 'Name', size: 'large' as const, placeholder: 'Name' };

type WordKeyProps = {
  children: ReactNode;
  disabled?: boolean;
  isQuiet?: boolean;
  isPressed?: boolean;
  onClick: () => void;
  onHold?: () => void;
};

const KINDS = {
  pressed: { isPressed: true },
  'held (press and hold)': { onHold: nothing },
  quiet: { isQuiet: true },
  disabled: { disabled: true },
  'long text': {},
};

// A key that says a word, in its default state and in each of `kinds`.
function wordKey(name: string, Key: ComponentType<WordKeyProps>, word: string, kinds: (keyof typeof KINDS)[]): Specimen {
  const shown = (kind?: keyof typeof KINDS) => (
    <Key onClick={nothing} {...(kind && KINDS[kind])}>
      {kind === 'long text' ? LONG_NAME : word}
    </Key>
  );
  return { name, states: Object.fromEntries([['default', shown()], ...kinds.map((kind) => [kind, shown(kind)])]) };
}

const KEYS: Specimen[] = [
  wordKey('Press', Press, 'A press with no look of its own', ['pressed', 'held (press and hold)', 'disabled']),
  wordKey('TextKey', TextKey, 'SAVE', ['quiet', 'disabled', 'long text']),
  wordKey('ActionKey', ActionKey, 'Join this Wi-Fi', ['disabled', 'long text']),
  wordKey('LinkKey', LinkKey, 'Update now', ['long text']),
  // An add key keeps to one line (`white-space: nowrap`), so it has no long text state.
  wordKey('AddKey', AddKey, '+ ADD A LIGHT', []),
  {
    name: 'FileKey',
    states: {
      default: (
        <FileKey accept=".json" onFile={nothing}>
          CHOOSE A FILE
        </FileKey>
      ),
    },
  },
  {
    name: 'BackKey',
    states: { default: <BackKey label="Home" onClick={nothing} />, 'long text': <BackKey label={LONG_NAME} onClick={nothing} /> },
  },
  {
    name: 'KeyRow',
    states: {
      default: (
        <KeyRow>
          <TextKey onClick={nothing}>RESET</TextKey>
          <TextKey onClick={nothing}>EDIT</TextKey>
        </KeyRow>
      ),
    },
  },
  {
    name: 'PowerKey',
    states: {
      off: <PowerKey label="Power" isOn={false} onChange={nothing} />,
      on: <PowerKey label="Power" isOn onChange={nothing} />,
      'disabled off': <PowerKey label="Power" isOn={false} disabled onChange={nothing} />,
      'disabled on': <PowerKey label="Power" isOn disabled onChange={nothing} />,
    },
  },
  {
    name: 'OptionRow',
    states: {
      'one picked': <OptionRow label="Speed" options={options} value="medium" onChange={nothing} />,
      'long text': (
        <OptionRow
          label="Names"
          options={[
            { value: 'one', name: 'ONE' },
            { value: 'long', name: LONG_NAME.toUpperCase() },
          ]}
          value="long"
          onChange={nothing}
        />
      ),
    },
  },
];

const FADERS: Specimen[] = [
  {
    name: 'Fader',
    states: {
      lit: <Fader {...fader} />,
      'not lit': <Fader {...fader} isLit={false} />,
      disabled: <Fader {...fader} disabled />,
      gradient: <Fader {...fader} label="Hue" gradient={gradientOf(SUNSET.map(hexToColour))} />,
      'halo armed': <Fader {...fader} halo="armed" />,
      'halo hot': <Fader {...fader} halo="hot" />,
      'halo driven': <Fader {...fader} halo="driven" />,
    },
  },
  {
    name: 'FaderBand',
    states: {
      default: (
        <Fader {...fader}>
          <FaderBand from={0.3} to={0.8} />
        </Fader>
      ),
      inert: (
        <Fader {...fader}>
          <FaderBand from={0.3} to={0.8} isInert />
        </Fader>
      ),
    },
  },
  {
    name: 'FaderDot',
    states: {
      'hidden until its owner moves it': (
        <Fader {...fader}>
          <FaderDot ref={null} />
        </Fader>
      ),
    },
  },
];

const FIELDS: Specimen[] = [
  {
    name: 'TextField',
    states: {
      empty: <TextField {...field} />,
      filled: <TextField {...field} defaultValue="Bedroom" />,
      small: <TextField {...field} size="small" defaultValue="Bedroom" />,
      'long text': <TextField {...field} defaultValue={LONG_NAME} />,
      password: <TextField {...field} label="Password" type="password" defaultValue="made-up" />,
      time: <TextField {...field} label="Time" type="time" defaultValue="07:30" />,
    },
  },
  {
    name: 'TextArea',
    states: {
      empty: <TextArea label="Look" placeholder="Paste a look" value="" onChange={nothing} />,
      'long text': <TextArea label="Look" value={LONG_NAME.repeat(4)} onChange={nothing} />,
    },
  },
];

const COLOURS: Specimen[] = [
  {
    name: 'Swatch',
    states: {
      painted: <Swatch colour={colour} />,
      'a key': <Swatch colour={colour} label="Colour" onPick={nothing} />,
      'disabled key': <Swatch colour={colour} label="Colour" disabled onPick={nothing} />,
    },
  },
  {
    name: 'ColourSlot',
    states: {
      default: <ColourSlot colour={colour} label="Colour 1" isSelected={false} onClick={nothing} />,
      selected: <ColourSlot colour={colour} label="Colour 1" isSelected onClick={nothing} />,
    },
  },
  {
    name: 'ColourPad',
    states: { default: <ColourPad colour={colour} onChange={nothing} /> },
  },
  {
    name: 'ColourFill',
    states: {
      gradient: <PaintSample paint={gradientOf(SUNSET.map(hexToColour))} />,
      'one colour': <PaintSample paint={colour} />,
      'no paint': <PaintSample />,
    },
  },
  {
    name: 'LedStrip',
    states: {
      room: <LedStrip recording={RECORDING} shape="room" onFirstView={nothing} />,
      tile: <LedStrip recording={RECORDING} shape="tile" onFirstView={nothing} />,
      line: <LedStrip recording={RECORDING} shape="line" onFirstView={nothing} />,
      dim: <LedStrip recording={RECORDING} shape="line" brightness={0.3} onFirstView={nothing} />,
      off: <LedStrip recording={RECORDING} shape="line" isOn={false} onFirstView={nothing} />,
      'no recording yet': <LedStrip recording={null} shape="line" onFirstView={nothing} />,
    },
  },
];

const icons = Object.entries(Icon).map(([name, Drawn]) => [name, <Drawn key={name} />] as const);

const MARKS: Specimen[] = [
  { name: 'Icon', states: Object.fromEntries(icons) },
  {
    name: 'IconFrame',
    states: {
      default: (
        <IconFrame viewBox="0 0 14 14">
          <path d="M2 7h10" />
        </IconFrame>
      ),
    },
  },
  {
    name: 'StatusMark',
    states: { on: <StatusMark state="on" />, off: <StatusMark state="off" />, silent: <StatusMark state="silent" /> },
  },
  { name: 'SoundMark', states: { default: <SoundMark /> } },
  { name: 'Eyebrow', states: { default: <Eyebrow>LIGHTS</Eyebrow>, 'long text': <Eyebrow>{LONG_NAME.toUpperCase()}</Eyebrow> } },
  {
    name: 'Picked',
    states: {
      'under, off': <Picked>Bedroom</Picked>,
      'under, on': <Picked isOn>Bedroom</Picked>,
      'side, on': (
        <Press isPressed onClick={nothing}>
          <Picked isOn edge="side" />
          The side mark sits down the row
        </Press>
      ),
    },
  },
  { name: 'ValueText', states: { default: <ValueText>60 %</ValueText>, 'long text': <ValueText>{LONG_NAME}</ValueText> } },
  {
    name: 'Dialog',
    states: {
      'open on demand': (
        <OnDemand label="OPEN DIALOG">
          {(close) => (
            <Dialog label="A dialog" onClose={close}>
              <TextKey onClick={close}>CLOSE</TextKey>
            </Dialog>
          )}
        </OnDemand>
      ),
      'wide, on demand': (
        <OnDemand label="OPEN WIDE DIALOG">
          {(close) => (
            <Dialog label="A wide dialog" isWide onClose={close}>
              <TextKey onClick={close}>CLOSE</TextKey>
            </Dialog>
          )}
        </OnDemand>
      ),
    },
  },
];

export const PRIMITIVES = [...KEYS, ...FADERS, ...FIELDS, ...COLOURS, ...MARKS];
