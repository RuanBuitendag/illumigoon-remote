import { LookGroup, LookItem, LookList } from '../../composites';
import { applyLook, type Light } from '../store/fleet-store';
import { useHousehold } from '../store/household-store';
import { libraryFor, partOfRoomNote, type LibraryLook } from '../store/look-library';
import { setSheetOpen } from '../store/navigation-store';
import { isAnyOn, isMixedLook, lookNameOf } from '../store/rooms';
import { LookStrip } from './look-strip';

const TILE_BRIGHTNESS = 0.85;

export function LookLibrary({ lights }: { lights: Light[] }) {
  const savedLooks = useHousehold((household) => household.savedLooks);
  const playingName = isMixedLook(lights) ? null : lookNameOf(lights[0]);

  const pick = (look: LibraryLook) => {
    if (look.name === playingName && isAnyOn(lights)) setSheetOpen(true);
    else applyLook(look.lights, look.name, look.animation);
  };

  return (
    <LookList>
      {libraryFor(lights, savedLooks).map(({ title, note, looks }) => (
        <LookGroup key={title} title={title} note={note}>
          {looks.map((look) => (
            <LookItem
              key={look.id}
              name={look.name}
              description={look.description}
              note={partOfRoomNote(look, lights)}
              hasSound={look.hasSound}
              isPlaying={look.name === playingName}
              strip={<LookStrip source={look.preview} shape="tile" brightness={TILE_BRIGHTNESS} />}
              onPick={() => pick(look)}
            />
          ))}
        </LookGroup>
      ))}
    </LookList>
  );
}
