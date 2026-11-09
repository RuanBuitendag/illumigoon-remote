import type { Meta } from '@storybook/react-vite';
import { specimenStory } from './catalogue';

const DOOR = 'src/composites';

export default { title: 'Composites/Looks and rooms' } satisfies Meta;

export const FavouriteLookItem = specimenStory('FavouriteLookItem', DOOR);
export const FavouriteLooks = specimenStory('FavouriteLooks', DOOR);
export const FavouriteSceneItem = specimenStory('FavouriteSceneItem', DOOR);
export const LightCard = specimenStory('LightCard', DOOR);
export const LockNote = specimenStory('LockNote', DOOR);
export const LookElsewhere = specimenStory('LookElsewhere', DOOR);
export const LookGroup = specimenStory('LookGroup', DOOR);
export const LookHeading = specimenStory('LookHeading', DOOR);
export const LookItem = specimenStory('LookItem', DOOR);
export const LookList = specimenStory('LookList', DOOR);
export const LookPreset = specimenStory('LookPreset', DOOR);
export const LookProblem = specimenStory('LookProblem', DOOR);
export const LookSearch = specimenStory('LookSearch', DOOR);
export const MoreRow = specimenStory('MoreRow', DOOR);
export const QuietNote = specimenStory('QuietNote', DOOR);
export const RoomCard = specimenStory('RoomCard', DOOR);
export const RoomDragList = specimenStory('RoomDragList', DOOR);
export const RoomSection = specimenStory('RoomSection', DOOR);
export const SceneCard = specimenStory('SceneCard', DOOR);
export const SceneLine = specimenStory('SceneLine', DOOR);
export const SceneShelf = specimenStory('SceneShelf', DOOR);
export const StateCard = specimenStory('StateCard', DOOR);
export const StateList = specimenStory('StateList', DOOR);
export const WhichLine = specimenStory('WhichLine', DOOR);
