import type { ReactNode } from 'react';
import {
  ActionKey,
  AddKey,
  BackKey,
  ColourSlot,
  Eyebrow,
  Fader,
  KeyRow,
  LinkKey,
  LockMark,
  OptionRow,
  Picked,
  PowerKey,
  SoundMark,
  STARTER_COLOUR_SETS,
  StatusMark,
  TextArea,
  TextField,
  TextKey,
  ValueText,
} from '../design-system';
import { SelectRow, SliderRow, StepperRow, ToggleRow } from './control-rows';
import { QuietNote, RoomCard } from './room-card';

// Every primitive and the main composites in each state they take, with made-up values. Open the
// app with `?gallery` to see it. `npm run screenshots` compares each section with its saved picture.

const noop = () => undefined;
const CHOICES = [
  { value: 'one', name: 'One' },
  { value: 'two', name: 'Two' },
  { value: 'three', name: 'Three' },
];
const SUNSET = STARTER_COLOUR_SETS[0]?.colours ?? [];
const LIGHTS = [
  { id: 'a', name: 'Left', state: 'on' as const },
  { id: 'b', name: 'Right', state: 'off' as const },
  { id: 'c', name: 'Shelf', state: 'silent' as const },
];

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="gallery-section" data-gallery={name}>
      <Eyebrow>{name}</Eyebrow>
      {children}
    </section>
  );
}

function Keys() {
  return (
    <Section name="Keys">
      <KeyRow>
        <TextKey onClick={noop}>Normal</TextKey>
        <TextKey isQuiet onClick={noop}>
          Quiet
        </TextKey>
        <TextKey disabled onClick={noop}>
          Disabled
        </TextKey>
      </KeyRow>
      <ActionKey onClick={noop}>Main action</ActionKey>
      <ActionKey disabled onClick={noop}>
        Main action, disabled
      </ActionKey>
      <KeyRow>
        <LinkKey onClick={noop}>Link</LinkKey>
        <AddKey onClick={noop}>Add</AddKey>
        <BackKey label="Back" onClick={noop} />
      </KeyRow>
    </Section>
  );
}

function Switches() {
  return (
    <Section name="Switches">
      <KeyRow>
        <PowerKey label="On" isOn onChange={noop} />
        <PowerKey label="Off" isOn={false} onChange={noop} />
        <PowerKey label="On, disabled" isOn disabled onChange={noop} />
        <PowerKey label="Off, disabled" isOn={false} disabled onChange={noop} />
      </KeyRow>
      <OptionRow label="Choice" options={CHOICES} value="two" onChange={noop} />
    </Section>
  );
}

function Faders() {
  return (
    <Section name="Faders">
      <Fader label="Lit" value={60} min={0} max={100} step={1} onChange={noop} />
      <Fader label="Not lit" value={60} min={0} max={100} step={1} isLit={false} onChange={noop} />
      <Fader label="Disabled" value={30} min={0} max={100} step={1} disabled onChange={noop} />
    </Section>
  );
}

function Fields() {
  return (
    <Section name="Fields">
      <TextField label="Large, empty" size="large" placeholder="Name" />
      <TextField label="Large, filled" size="large" defaultValue="Lounge" />
      <TextField label="Small" size="small" defaultValue="Shelf" />
      <TextArea label="Text area" value={'Two lines\nof text'} onChange={noop} />
    </Section>
  );
}

function MarksAndText() {
  return (
    <Section name="Marks and text">
      <KeyRow>
        <StatusMark state="on" />
        <StatusMark state="off" />
        <StatusMark state="silent" />
        <SoundMark />
        <LockMark />
      </KeyRow>
      <KeyRow>
        <Picked isOn>Picked</Picked>
        <Picked>Not picked</Picked>
        <ValueText>42%</ValueText>
      </KeyRow>
      <KeyRow>
        {SUNSET.slice(0, 3).map((colour, index) => (
          <ColourSlot key={colour} colour={colour} label={`Colour ${index + 1}`} isSelected={index === 0} onClick={noop} />
        ))}
      </KeyRow>
      <QuietNote>A quiet note.</QuietNote>
    </Section>
  );
}

function ControlRows() {
  return (
    <Section name="Control rows">
      <SliderRow label="Brightness" valueText="60%" value={60} min={0} max={100} step={1} onChange={noop} />
      <StepperRow label="Speed" valueText="2x" onStep={noop} />
      <SelectRow label="Mode" options={CHOICES} value="one" onChange={noop} />
      <ToggleRow label="Moves to music" isOn onChange={noop} />
      <ToggleRow label="Disabled" isOn={false} disabled onChange={noop} />
    </Section>
  );
}

function RoomCards() {
  const card = { strip: null, hasSound: false, hasLooks: false, children: null, lightStates: LIGHTS };
  return (
    <Section name="Room cards">
      <RoomCard
        {...card}
        name="Lounge"
        lookName="Ink Drop"
        hasSound
        power={<PowerKey label="Lounge" isOn onChange={noop} />}
        note={null}
        isOpen={false}
        onOpen={noop}
      />
      <RoomCard
        {...card}
        name="Open room"
        lookName=""
        power={<PowerKey label="Open room" isOn={false} onChange={noop} />}
        note="A note on the card"
        isOpen
        onOpen={noop}
      />
      <RoomCard
        {...card}
        name="Not answered"
        lookName=""
        power={<PowerKey label="Not answered" isOn={false} disabled onChange={noop} />}
        note={null}
        isOpen={false}
      />
    </Section>
  );
}

export function Gallery() {
  return (
    <main className="gallery">
      <Keys />
      <Switches />
      <Faders />
      <Fields />
      <MarksAndText />
      <ControlRows />
      <RoomCards />
    </main>
  );
}
