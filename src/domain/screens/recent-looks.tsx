import { RecentLookItem, RecentLooks, RoomSection } from '../../composites';
import type { Light } from '../store/fleet-store';
import { useHousehold } from '../store/household-store';
import { playLook } from '../store/look-play';
import { endPreview, previewLook, useShownLights } from '../store/look-preview';
import { canPlay, isAnyOn, isMixedLook, lookNameOf, previewOfAnimation, type Room } from '../store/rooms';
import { LookStrip } from './look-strip';

type RecentLookRowProps = { room: Room; lights: Light[]; isBare?: boolean };

export function RecentLookRow({ room, lights, isBare }: RecentLookRowProps) {
  const recent = useHousehold((household) => household.recentLooks[room.id]);
  const shownLights = useShownLights(lights);
  const playingName = isMixedLook(shownLights) || !isAnyOn(shownLights) ? null : lookNameOf(shownLights[0]);
  const looks = (recent ?? []).map((look) => ({
    ...look,
    players: lights.filter((light) => canPlay(light, look.animation)),
  }));
  const playable = looks.filter(({ players }) => players.length > 0);
  if (playable.length === 0) return null;
  const grid = (
    <RecentLooks>
      {playable.map(({ name, animation, players }) => (
        <RecentLookItem
          key={name}
          name={name}
          isPlaying={name === playingName}
          strip={<LookStrip source={previewOfAnimation(animation)} shape="tile" />}
          onPick={() => {
            if (name !== playingName) playLook(players, name, animation);
          }}
          onHold={() => previewLook(players, name, animation)}
          onHoldEnd={endPreview}
        />
      ))}
    </RecentLooks>
  );
  return isBare ? grid : <RoomSection eyebrow="RECENT">{grid}</RoomSection>;
}
