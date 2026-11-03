import { RecentLookItem, RecentLooks } from '../../composites';
import type { Light } from '../store/fleet-store';
import { useHousehold } from '../store/household-store';
import { playLook } from '../store/look-play';
import { endPreview, previewLook, useShownLights } from '../store/look-preview';
import { canPlay, playingLookName, playsExactly, previewOfAnimation, type Room } from '../store/rooms';
import { LookStrip } from './look-strip';

type RecentLookRowProps = { room: Room; lights: Light[]; limit: number };

// The look on the lights is left out, unless a light has moved away from it and a tap would bring it back.
export function RecentLookRow({ room, lights, limit }: RecentLookRowProps) {
  const recent = useHousehold((household) => household.recentLooks[room.id]);
  const shownLights = useShownLights(lights);
  const playingName = playingLookName(shownLights);
  const looks = (recent ?? []).map((look) => ({
    ...look,
    players: lights.filter((light) => canPlay(light, look.animation)),
  }));
  const isPlaying = ({ name, animation }: (typeof looks)[number]) =>
    name === playingName && playsExactly(shownLights, animation);
  const playable = looks.filter((look) => look.players.length > 0 && !isPlaying(look));
  if (playable.length === 0) return null;
  return (
    <RecentLooks>
      {playable.slice(0, limit).map(({ name, animation, players }) => (
        <RecentLookItem
          key={name}
          name={name}
          strip={<LookStrip source={previewOfAnimation(animation)} shape="tile" />}
          onPick={() => playLook(players, name, animation)}
          onHold={() => previewLook(players, name, animation)}
          onHoldEnd={endPreview}
        />
      ))}
    </RecentLooks>
  );
}
