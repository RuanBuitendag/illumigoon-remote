import { FavouriteLookItem, FavouriteLooks } from '../../composites';
import type { Light } from '../store/fleet-store';
import { useHousehold } from '../store/household-store';
import { useLookFiles } from '../store/look-files';
import { favouriteLooks } from '../store/look-library';
import { playLook } from '../store/look-play';
import { endPreview, previewLook, useShownLights } from '../store/look-preview';
import { playingLookName } from '../store/rooms';
import { LookStrip } from './look-strip';

// The looks starred on Looks that these lights can play. A tap plays one, a hold tries it.
export function FavouriteLookRow({ lights }: { lights: Light[] }) {
  const favourites = useHousehold((household) => household.favouriteLooks);
  const mine = useLookFiles((files) => files.mine);
  const shelf = useLookFiles((files) => files.shelf);
  const playingName = playingLookName(useShownLights(lights));
  const looks = favouriteLooks(lights, mine, shelf, favourites);
  if (looks.length === 0) return <FavouriteLooks empty="Star a look to put it here" />;
  return (
    <FavouriteLooks>
      {looks.map(({ id, name, preview, animation, lights: players }) => (
        <FavouriteLookItem
          key={id}
          name={name}
          isPlaying={name === playingName}
          strip={<LookStrip source={preview} shape="tile" />}
          onPick={() => animation && playLook(players, name, animation)}
          onHold={() => animation && previewLook(players, name, animation)}
          onHoldEnd={endPreview}
        />
      ))}
    </FavouriteLooks>
  );
}
