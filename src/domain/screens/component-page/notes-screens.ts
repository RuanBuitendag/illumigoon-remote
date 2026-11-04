// The notes of the screens, sheets and this page's own parts, and of Edit's controls, on the component page (CM-7).
import { note, type Notes } from './notes-design-system';

const DRAWN = 'None. It holds no control.';
const PRESSES = 'Tab reaches it, and Enter or Space presses it.';
const ITS_PARTS = 'Only the keys inside it, each a stop of its own.';
const NO_ROLE = 'No role of its own.';
const ON_TOP = 'The focus moves in when it opens and stays inside. Escape closes it and gives the focus back.';

const SCREEN_NOTES: Record<string, Notes> = {
  HomeLayout: note(
    'The wordmark, the rooms, and a notice at the foot.',
    'Tab goes from the wordmark down through the rooms.',
    'A header, sections, and a footer that is a status.',
    'Keep the rooms first; a notice waits at the foot.',
    'Put a second notice over the rooms.',
  ),
  HouseSection: note(
    'A heading and a key, over the rooms.',
    ITS_PARTS,
    'A section, with its title as a heading.',
    'Put a key for the whole house here: ALL OFF.',
    'Put a key for one room here.',
  ),
  HouseNote: note(
    'A line and a key, for a house with nothing in it yet.',
    PRESSES,
    'Plain text and a button.',
    'Say what is missing and the one step that fills it.',
    'Show it once the house has a light.',
  ),
  HomeAdd: note(
    'An AddKey on a row of its own.',
    PRESSES,
    'A button, named by its words.',
    'Put it under what it adds to.',
    'Put two on one screen.',
  ),
  BottomNotice: note(
    'A line at the foot, with a key and maybe Later.',
    ITS_PARTS,
    'A status, read aloud when it changes.',
    'Say what is happening and what you will see.',
    'Stack two notices.',
  ),
  ScreenStack: note(
    'Home, a room and a page, each pushed over the one under it.',
    'The device’s Back, the iPhone’s swipe and the back key each go back one screen.',
    'Each screen is a main. A covered screen is inert.',
    'Give every screen its own address and history step.',
    'Open a screen with no way back.',
  ),
  PageFrame: note(
    'A back key, the title, an intro, then sections.',
    ITS_PARTS,
    'A level 1 heading, then the page.',
    'Say in the intro what the page is for.',
    'Write more than a few short lines of intro.',
  ),
  PageSection: note(
    'A column of rows, a section apart from the next.',
    ITS_PARTS,
    'A section.',
    'Start a section with an Eyebrow when it holds more than one row.',
    'Put a section inside a section.',
  ),
  RoomLayout: note(
    'The back key, the room’s name and power switch, then its sections.',
    'Tab reaches the back key, the power switch, then the sections.',
    'A level 1 heading named by the room, and a switch.',
    'Keep the power switch beside the name.',
    'Put a second power switch for the room lower down.',
  ),
  EditLayout: note(
    'The back key, the look’s name, where it plays, SAVE, and the section keys.',
    'Tab reaches the back key, SAVE and the section keys in turn.',
    'A level 1 heading named by the look, and pressed buttons for the sections.',
    'Show SAVE only when there is something to save.',
    'Leave Edit with no way to keep a change.',
  ),
  SearchLayout: note(
    'A large strip, a line, a hint and a key.',
    ITS_PARTS,
    'Plain text and a button. The strip is hidden from the reader.',
    'Say what the app is doing, and what to try when nothing is found.',
    'Blame the person when nothing is found.',
  ),
  Toast: note(
    'A line on the ink fill at the foot, with UNDO or SAVE.',
    'Tab reaches its keys. It does not take the focus.',
    'A polite status, read aloud when it changes.',
    'Say what changed, and offer UNDO for as long as UNDO_SECONDS.',
    'Show two toasts at once.',
  ),
  Presence: note(
    'A holder that keeps a leaving thing on screen until its motion ends.',
    DRAWN,
    NO_ROLE,
    'Wrap a sheet, a dialog or a toast that leaves with motion.',
    'Hold a thing that has no leaving motion.',
  ),
};

const SHEET_NOTES: Record<string, Notes> = {
  Sheet: note(
    'A head with an icon, the name, what it is for, and a cross or its own keys; then the body.',
    ON_TOP,
    'A modal dialog, named by its label.',
    'Name it by what it sets: Off timer.',
    'Open a sheet from a sheet.',
  ),
  SheetBody: note(
    'The scrolling body of a sheet, with its margins.',
    ITS_PARTS,
    NO_ROLE,
    'Put a sheet’s rows in it.',
    'Use it outside a sheet in the app.',
  ),
  SheetFooter: note(
    'A hairline, then CANCEL on the left and the main key on the right.',
    ITS_PARTS,
    NO_ROLE,
    'Make CANCEL quiet and the main key full.',
    'Put more than two keys in it.',
  ),
  Overlay: note(
    'A sheet for a choice that covers the screen, with DONE in its head.',
    ON_TOP,
    'A modal dialog, named by its label.',
    'Use it for a choice of many lights.',
    'Use it for a single setting. That is a sheet.',
  ),
  OverlayBlock: note(
    'A titled block of an overlay.',
    ITS_PARTS,
    'A group, named by its title.',
    'Use one block for each room.',
    'Leave a block without a title.',
  ),
  OverlayText: note(
    'Text in an overlay, with its lines kept as written.',
    DRAWN,
    'Plain text.',
    'Use it for a short explanation in an overlay.',
    'Use it for a long help text.',
  ),
  WhichLights: note(
    'The rooms, and in each the lights to pick, each wearing the selected mark when picked.',
    'Tab reaches each light, and Enter or Space picks it.',
    'Buttons with aria-pressed, named by the light.',
    'Show every light under its room.',
    'Say the picked lights again in a line under the list.',
  ),
};

const PAGE_PART_NOTES: Record<string, Notes> = {
  ComponentPageLayout: note(
    'This page’s title, its intro, and its entries.',
    ITS_PARTS,
    'A level 1 heading, then the entries.',
    'Load its style sheet only when it shows.',
    'Ship it in the release.',
  ),
  ComponentEntry: note(
    'A component’s name and door, its notes, then its states side by side.',
    ITS_PARTS,
    'A section named by the component.',
    'Give every export of a door one entry.',
    'Draw a state that the app never shows.',
  ),
  ComponentState: note(
    'The name of a state over the component drawn in it.',
    ITS_PARTS,
    NO_ROLE,
    'Name a state by what is true in it: playing.',
    'Name a state by its props.',
  ),
  ComponentFrame: note(
    'A box that holds a component that fills the window.',
    ITS_PARTS,
    NO_ROLE,
    'Put a screen, a sheet or a toast in it.',
    'Put a row in it.',
  ),
  PaintSample: note('A painted box a thumb wide.', DRAWN, 'Drawn only.', 'Use it to show a ColourFill.', 'Use it in the app.'),
  ComponentNotes: note(
    'Five short notes: parts, keys, role, one to do and one not to.',
    DRAWN,
    'A description list.',
    'Write each note in one short line, in the voice of the app.',
    'Write small print.',
  ),
  ComponentFocusState: note(
    'A state drawn again with the focus ring on its first control.',
    ITS_PARTS,
    NO_ROLE,
    'Let every component with a control show it.',
    'Use it for a sheet or dialog. Opening one moves the focus there.',
  ),
};

// Edit's controls, drawn by the editor package, which names them in its specimens.
const EDIT_NOTES: Record<string, Notes> = {
  Pill: note(
    'A word in capitals in a small rounded box. The main one is full.',
    PRESSES,
    'A button, named by its words.',
    'Make one Pill the main step, such as SAVE.',
    'Make two Pills full in one row.',
  ),
  IconKey: note(
    'An icon in a key, with its name shown to a pointer.',
    PRESSES,
    'A button, named by its label.',
    'Give it a label that says what it does: Add a layer.',
    'Use an icon a person must guess.',
  ),
  Toggle: note(
    'A letter that is quiet when off and wears the selected mark when on.',
    'Tab reaches it, and Enter or Space turns it.',
    'A button with aria-pressed, named by what it turns.',
    'Use it for mute, solo and a wired source.',
    'Show it on with a wash.',
  ),
  Seg: note(
    'The app’s OptionRow, set closer, in the note type.',
    'Tab reaches each word, and Enter or Space picks it.',
    'A group named by its label, of buttons with aria-pressed.',
    'Use it inline, beside what it sets.',
    'Use it for more than fit on one line.',
  ),
  Knob: note(
    'A dial with its arc, its value, and the marks of what moves it.',
    'The arrows step a hundredth, Shift a thousandth, Page Up and Page Down a tenth, and Home and End go to the ends.',
    'A slider, with its range and its value in words.',
    'Turn it by the arrows or a drag in its own taper.',
    'Show a value with more figures than a person reads.',
  ),
  Field: note(
    'A text field in a well.',
    'Tab in and type; Tab leaves.',
    'A text box, named by its label.',
    'Give it a label, which a pointer also shows.',
    'Write a raw field in Edit. Use Field.',
  ),
  Choice: note(
    'A menu in a small chip.',
    'Tab reaches it, and the arrows choose.',
    'A menu, named by its label.',
    'Use it for a choice of many, such as the blend.',
    'Use it for two choices. That is a Seg.',
  ),
};

export const SCREEN_AND_EDIT_NOTES: Record<string, Notes> = {
  ...SCREEN_NOTES,
  ...SHEET_NOTES,
  ...PAGE_PART_NOTES,
  ...EDIT_NOTES,
};
