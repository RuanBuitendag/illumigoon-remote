import { RecentLookItem, RecentLooks } from '../../composites';
import type { Light } from '../store/fleet-store';
import { useHousehold } from '../store/household-store';
import { listensToMusic } from '../looks/looks';
import { playLook } from '../store/look-play';
import { endPreview, previewLook, useShownLights } from '../store/look-preview';
import { canPlay, isAnyOn, isMixedLook, lookNameOf, previewOfAnimation, type Room } from '../store/rooms';
import { LookStrip } from './look-strip';

type RecentLookRowProps = { room: Room; lights: Light[]; limit: number };

export function RecentLookRow({ room, lights, limit }: RecentLookRowProps) {
  const recent = useHousehold((household) => household.recentLooks[room.id]);
  const shownLights = useShownLights(lights);
  const playingName = isMixedLook(shownLights) || !isAnyOn(shownLights) ? null : lookNameOf(shownLights[0]);
  const looks = (recent ?? []).map((look) => ({
    ...look,
    players: lights.filter((light) => canPlay(light, look.animation)),
  }));
  const playable = looks.filter(({ name, players }) => players.length > 0 && name !== playingName);
  if (playable.length === 0) return null;
  return (
    <RecentLooks>
      {playable.slice(0, limit).map(({ name, animation, players }) => (
        <RecentLookItem
          key={name}
          name={name}
          hasSound={listensToMusic(animation)}
          strip={<LookStrip source={previewOfAnimation(animation)} shape="tile" />}
          onPick={() => playLook(players, name, animation)}
          onHold={() => previewLook(players, name, animation)}
          onHoldEnd={endPreview}
        />
      ))}
    </RecentLooks>
  );
}
