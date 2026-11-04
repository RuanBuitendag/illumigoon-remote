import {
  BottomNotice,
  ComponentEntry,
  ComponentFocusState,
  ComponentFrame,
  ComponentNotes,
  ComponentPageLayout,
  ComponentState,
  EditLayout,
  HomeAdd,
  HomeLayout,
  HouseNote,
  HouseSection,
  Overlay,
  OverlayBlock,
  OverlayText,
  PageFrame,
  PageHint,
  PageSection,
  PaintSample,
  QuietNote,
  RoomLayout,
  ScreenStack,
  SearchLayout,
  Sheet,
  SheetBody,
  SheetFooter,
  Toast,
  WhichLights,
} from '../../../composites';
import { useState } from 'react';
import { Icon, LedStrip, PowerKey, Presence, TextKey } from '../../../design-system';
import { LONG_NAME, nothing, OnDemand, RECORDING, type Specimen } from './specimen';

const strip = <LedStrip recording={RECORDING} shape="room" onFirstView={nothing} />;
const power = <PowerKey label="Lounge power" isOn onChange={nothing} />;
const notice = <BottomNotice text="A new version is ready." actionLabel="Update now" onAction={nothing} />;
const home = (
  <HomeLayout wordmark="ILLUMIGOON" onWordmark={nothing} notice={null}>
    <HouseSection title="ROOMS" action={<TextKey onClick={nothing}>ALL OFF</TextKey>}>
      <QuietNote>Rooms stand here.</QuietNote>
    </HouseSection>
  </HomeLayout>
);
const room = (
  <RoomLayout name="Lounge" power={power} backLabel="Home" onBack={nothing}>
    <QuietNote>The room's parts stand here.</QuietNote>
  </RoomLayout>
);
const page = <PageFrame title="Room settings" intro="What the room is called and how it changes." backLabel="Lounge" onBack={nothing} />;
const stack = { home, room, page, isRoomOpen: false, isPageOpen: false, isPageWide: false };
const sections = [
  { value: 'look', name: 'LOOK' },
  { value: 'colours', name: 'COLOURS' },
];
const edit = { backLabel: 'Lounge', title: 'Candle', sections, section: 'look', onSection: nothing, onBack: nothing };
const whichRooms = [{ id: 'lounge', name: 'Lounge', lights: [{ id: 'left', name: 'Left' }, { id: 'right', name: 'Right' }] }];
const undo = <TextKey onClick={nothing}>UNDO</TextKey>;

const HOME: Specimen[] = [
  {
    name: 'HomeLayout',
    focus: null,
    states: {
      default: <ComponentFrame size="screen">{home}</ComponentFrame>,
      'with a notice': (
        <ComponentFrame size="screen">
          <HomeLayout wordmark="ILLUMIGOON" onWordmark={nothing} notice={notice}>
            <HomeAdd onClick={nothing}>+ ADD A LIGHT</HomeAdd>
          </HomeLayout>
        </ComponentFrame>
      ),
    },
  },
  {
    name: 'HouseSection',
    states: { default: <HouseSection title="ROOMS" action={null}>{null}</HouseSection> },
  },
  {
    name: 'HouseNote',
    states: { default: <HouseNote text="No lights on this Wi-Fi yet." actionLabel="ADD A LIGHT" onAction={nothing} /> },
  },
  { name: 'HomeAdd', states: { default: <HomeAdd onClick={nothing}>+ ADD A ROOM</HomeAdd> } },
  {
    name: 'BottomNotice',
    states: {
      default: notice,
      'with later': <BottomNotice text={LONG_NAME} actionLabel="Update now" laterLabel="Later" onAction={nothing} onLater={nothing} />,
    },
  },
];

const PAGES: Specimen[] = [
  {
    name: 'ScreenStack',
    focus: null,
    states: {
      home: <ComponentFrame size="screen"><ScreenStack {...stack} /></ComponentFrame>,
      'room open': <ComponentFrame size="screen"><ScreenStack {...stack} isRoomOpen /></ComponentFrame>,
      'page open': <ComponentFrame size="screen"><ScreenStack {...stack} isRoomOpen isPageOpen /></ComponentFrame>,
    },
  },
  {
    name: 'PageFrame',
    states: {
      default: page,
      'long text': <PageFrame title={LONG_NAME} intro={LONG_NAME} backLabel={LONG_NAME} onBack={nothing} />,
    },
  },
  {
    name: 'PageSection',
    states: {
      default: (
        <PageSection>
          <PageHint>A section of a page.</PageHint>
        </PageSection>
      ),
    },
  },
  { name: 'RoomLayout', focus: null, states: { default: <ComponentFrame size="screen">{room}</ComponentFrame> } },
  {
    name: 'EditLayout',
    focus: null,
    states: {
      default: (
        <ComponentFrame size="screen">
          <EditLayout {...edit} where="Plays on Left and Right" onSave={nothing}>
            <QuietNote>The editor stands here.</QuietNote>
          </EditLayout>
        </ComponentFrame>
      ),
      'long text, no save': (
        <ComponentFrame size="screen">
          <EditLayout {...edit} title={LONG_NAME}>
            {null}
          </EditLayout>
        </ComponentFrame>
      ),
    },
  },
  {
    name: 'SearchLayout',
    focus: null,
    states: {
      'loading, searching': (
        <ComponentFrame size="screen">
          <SearchLayout strip={strip} text="Looking for lights." note="On this Wi-Fi." />
        </ComponentFrame>
      ),
      'error, nothing found': (
        <ComponentFrame size="screen">
          <SearchLayout strip={strip} text="No lights found." hint="Check that the lights are on." note="On this Wi-Fi.">
            <TextKey onClick={nothing}>TRY AGAIN</TextKey>
          </SearchLayout>
        </ComponentFrame>
      ),
    },
  },
  {
    name: 'Toast',
    focus: 'with a key',
    states: {
      'tells only': <ComponentFrame size="line"><Toast text="Saved." /></ComponentFrame>,
      'with a key': <ComponentFrame size="line"><Toast text="Lounge turned off.">{undo}</Toast></ComponentFrame>,
      'long text': <ComponentFrame size="line"><Toast text={LONG_NAME}>{undo}</Toast></ComponentFrame>,
      error: <ComponentFrame size="line"><Toast text="Could not reach the clipboard." /></ComponentFrame>,
    },
  },
  { name: 'Presence', focus: null, states: { 'a toast that leaves': <LeavingToast /> } },
];

// A toast inside Presence: HIDE lets it leave with its motion, SHOW brings it back.
function LeavingToast() {
  const [isShown, setIsShown] = useState(true);
  return (
    <ComponentFrame size="line">
      <TextKey onClick={() => setIsShown(!isShown)}>{isShown ? 'HIDE' : 'SHOW'}</TextKey>
      <Presence>{isShown && <Toast text="Saved." />}</Presence>
    </ComponentFrame>
  );
}

const SHEETS: Specimen[] = [
  {
    name: 'Sheet',
    focus: null,
    states: {
      'closes with a cross': (
        <OnDemand label="OPEN SHEET">
          {(close) => (
            <Sheet label="Off timer" icon={<Icon.Power />} detail="LOUNGE" onClose={close}>
              <SheetBody>
                <QuietNote>What the sheet holds.</QuietNote>
              </SheetBody>
            </Sheet>
          )}
        </OnDemand>
      ),
      'its own keys, wide': (
        <OnDemand label="OPEN WIDE SHEET">
          {(close) => (
            <Sheet label={LONG_NAME} isWide actions={<TextKey onClick={close}>DONE</TextKey>} onClose={close}>
              <SheetBody>
                <QuietNote>Room for a table.</QuietNote>
                <SheetFooter>
                  <TextKey isQuiet onClick={close}>CANCEL</TextKey>
                  <TextKey onClick={close}>SAVE</TextKey>
                </SheetFooter>
              </SheetBody>
            </Sheet>
          )}
        </OnDemand>
      ),
    },
  },
  {
    name: 'SheetBody',
    states: { 'outside a sheet': <SheetBody><QuietNote>The body keeps the sheet's margins.</QuietNote></SheetBody> },
  },
  {
    name: 'SheetFooter',
    states: { default: <SheetFooter><TextKey isQuiet onClick={nothing}>CANCEL</TextKey><TextKey onClick={nothing}>SAVE</TextKey></SheetFooter> },
  },
  {
    name: 'Overlay',
    focus: null,
    states: {
      'open on demand': (
        <OnDemand label="OPEN OVERLAY">
          {(close) => (
            <Overlay label="Which lights" actions={<TextKey onClick={close}>DONE</TextKey>} onClose={close}>
              <WhichLights rooms={whichRooms} picked={['left']} onToggle={nothing} />
            </Overlay>
          )}
        </OnDemand>
      ),
    },
  },
  { name: 'OverlayBlock', states: { default: <OverlayBlock label="Lounge"><QuietNote>A block of an overlay.</QuietNote></OverlayBlock> } },
  { name: 'OverlayText', states: { default: <OverlayText>{'Two lines,\nkept as written.'}</OverlayText> } },
  {
    name: 'WhichLights',
    states: {
      'one picked': <WhichLights rooms={whichRooms} picked={['left']} onToggle={nothing} />,
      'none picked': <WhichLights rooms={whichRooms} picked={[]} onToggle={nothing} />,
    },
  },
];

// This page's own frame, shown once more inside itself.
const PAGE_PARTS: Specimen[] = [
  {
    name: 'ComponentPageLayout',
    states: { 'this page': <ComponentPageLayout title="A page" intro="Its intro.">{null}</ComponentPageLayout> },
  },
  {
    name: 'ComponentEntry',
    states: {
      default: (
        <ComponentEntry name="AnExport" door="src/composites">
          <ComponentState state="default">
            <QuietNote>A state.</QuietNote>
          </ComponentState>
        </ComponentEntry>
      ),
    },
  },
  { name: 'ComponentState', states: { default: <ComponentState state="a state">{null}</ComponentState> } },
  { name: 'ComponentFrame', states: { line: <ComponentFrame size="line">{null}</ComponentFrame> } },
  { name: 'PaintSample', states: { default: <PaintSample paint="var(--text-3)" /> } },
  {
    name: 'ComponentNotes',
    states: { default: <ComponentNotes notes={[{ term: 'Parts', text: 'What it is made of.' }]} /> },
  },
  {
    name: 'ComponentFocusState',
    focus: null,
    states: { 'on a key': <ComponentFocusState><TextKey onClick={nothing}>SAVE</TextKey></ComponentFocusState> },
  },
];

export const SCREENS = [...HOME, ...PAGES, ...SHEETS, ...PAGE_PARTS];
