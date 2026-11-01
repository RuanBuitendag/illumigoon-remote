import { useEffect } from 'react';
import { LookGroup, LookItem, LookList, LookProblem } from '../../composites';
import { applyLook, type Light } from '../store/fleet-store';
import { loadLooks, useLookFiles } from '../store/look-files';
import { libraryFor, partOfRoomNote, type LibraryLook } from '../store/look-library';
import { endPreview, previewLook, useShownLights } from '../store/look-preview';
import { closePage } from '../store/navigation-store';
import { isAnyOn, isMixedLook, lookNameOf } from '../store/rooms';
import { LookStrip } from './look-strip';

const TILE_BRIGHTNESS = 0.85;

// Read again while open, so a file written to the folder from a terminal shows up.
const LIST_EVERY_MS = 3000;

function useFreshLooks() {
  useEffect(() => {
    const read = () => void loadLooks();
    read();
    const timer = setInterval(read, LIST_EVERY_MS);
    window.addEventListener('focus', read);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', read);
    };
  }, []);
}

export function LookLibrary({ lights }: { lights: Light[] }) {
  const mine = useLookFiles((files) => files.mine);
  const examples = useLookFiles((files) => files.examples);
  const listProblem = useLookFiles((files) => files.listProblem);
  const shownLights = useShownLights(lights);
  const playingName = isMixedLook(shownLights) ? null : lookNameOf(shownLights[0]);
  useFreshLooks();

  const pick = ({ name, lights: players, animation }: LibraryLook) => {
    if (!animation) return;
    if (name === playingName && isAnyOn(shownLights)) closePage();
    else applyLook(players, name, animation);
  };

  const hold = ({ name, lights: players, animation }: LibraryLook) => {
    if (animation) previewLook(players, name, animation);
  };

  return (
    <LookList>
      {listProblem && <LookProblem>{listProblem}</LookProblem>}
      {libraryFor(lights, mine, examples).map(({ title, note, looks }) => (
        <LookGroup key={title} title={title} note={note}>
          {looks.map((look) => (
            <LookItem
              key={look.id}
              name={look.name}
              description={look.description}
              note={look.animation && partOfRoomNote(look, lights)}
              hasSound={look.hasSound}
              isPlaying={look.name === playingName}
              disabled={!look.animation}
              strip={<LookStrip source={look.preview} shape="tile" brightness={TILE_BRIGHTNESS} />}
              onPick={() => pick(look)}
              onHold={() => hold(look)}
              onHoldEnd={endPreview}
            />
          ))}
        </LookGroup>
      ))}
    </LookList>
  );
}
