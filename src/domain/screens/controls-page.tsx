import { Hero, LevelRow, ScopeTabs } from '../../composites';
import { useRecording } from '../looks/recordings';
import { setBrightness, setPower, type Light } from '../store/fleet-store';
import { useShownLights } from '../store/look-preview';
import { openPage, setScope, useNavigation } from '../store/navigation-store';
import {
  highestBrightness,
  isAnyOn,
  isMixedLook,
  lightsInScope,
  lookNameOf,
  previewOfAnimation,
  type Room,
} from '../store/rooms';
import { AppPage } from './app-page';
import { LookControls } from './look-controls';
import { LookStrip } from './look-strip';
import { RecentLookRow } from './recent-looks';

const ALL_LIGHTS = 'all';

function RoomScope({ room, scope }: { room: Room; scope: string | null }) {
  if (room.lights.length < 2) return null;
  const allLabel = room.lights.length === 2 ? 'Both lights' : 'All lights';
  const tabs = room.writableLights.map(({ address, name }) => ({ value: address, name }));
  return (
    <ScopeTabs
      tabs={[{ value: ALL_LIGHTS, name: allLabel }, ...tabs]}
      value={scope ?? ALL_LIGHTS}
      onChange={(value) => setScope(value === ALL_LIGHTS ? null : value)}
    />
  );
}

type RoomHeroProps = { room: Room; lights: Light[]; scope: string | null };

function RoomHero({ room, lights, scope }: RoomHeroProps) {
  const shownLights = useShownLights(lights);
  const first = shownLights[0];
  const source = previewOfAnimation(first?.animation ?? null);
  const recording = useRecording(source);
  const isOn = isAnyOn(shownLights);
  const level = highestBrightness(shownLights);
  const isMixed = isMixedLook(shownLights);
  const hasLights = lights.length > 0;
  const canEdit = lights.some(({ isOnline, isOn: isLightOn }) => isOnline && isLightOn);
  return (
    <Hero
      tint={recording?.tint}
      strip={<LookStrip source={source} shape="hero" isOn={isOn} brightness={level} />}
      lookName={isMixed ? 'Mixed' : (lookNameOf(first) ?? '')}
      onChangeLook={hasLights ? () => openPage('looks', room.id, scope) : undefined}
      onEdit={canEdit ? () => openPage('editor', room.id, scope) : undefined}
    >
      <LevelRow
        label={room.name}
        isOn={isOn}
        level={level}
        disabled={!hasLights}
        onPower={(next) => setPower(lights, next)}
        onLevel={(next) => setBrightness(lights, next)}
      />
      {hasLights && !isMixed && <LookControls lights={lights} />}
    </Hero>
  );
}

// Everything about the look on a room or on one of its lights.
export function ControlsPage({ room }: { room: Room }) {
  const scopeAddress = useNavigation((navigation) => navigation.scopeAddress);
  const lights = lightsInScope(room, scopeAddress);
  const scope = lights.some(({ address }) => address === scopeAddress) ? scopeAddress : null;
  return (
    <AppPage title="All controls">
      <RoomScope room={room} scope={scope} />
      <RoomHero room={room} lights={lights} scope={scope} />
      <RecentLookRow room={room} lights={lights} />
    </AppPage>
  );
}
