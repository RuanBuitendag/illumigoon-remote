import {
  ColourTiles,
  LevelLine,
  LightCard as CardLayout,
  NoColours,
  SetTile,
  SolidTile,
} from '../../composites';
import { BLACK_HEX, hexToColour, STARTER_COLOURS, STARTER_COLOUR_SETS } from '../../design-system';
import type { Parameter } from '../light-network/protocol';
import { changeControl } from '../store/change-control';
import { setBrightness, type Light } from '../store/fleet-store';
import { closeCard, openPage } from '../store/navigation-store';
import { currentControls, isAnyOn, lookNameOf, previewOfAnimation, type Room } from '../store/rooms';
import { isUnreachable, OneLightSwitch, usePaint } from './light-list';
import { toHexList } from './look-controls';
import { LookStrip } from './look-strip';

const colourKey = (colours: string[]) => colours.join().toLowerCase();

function ColourChoices({ light, control }: { light: Light; control: Parameter }) {
  const current = colourKey(toHexList(control));
  const pick = (colours: string[]) =>
    changeControl(
      [light],
      control.key,
      control.type === 'palette' ? colours.map(hexToColour) : hexToColour(colours[0] ?? BLACK_HEX),
    );

  if (control.type !== 'palette') {
    return (
      <ColourTiles kind="solids">
        {STARTER_COLOURS.map((colour) => (
          <SolidTile
            key={colour}
            name={colour}
            paint={colour}
            isPicked={current === colour}
            onPick={() => pick([colour])}
          />
        ))}
      </ColourTiles>
    );
  }
  const sets = STARTER_COLOUR_SETS.filter(({ colours }) => colours.length >= (control.min ?? 1));
  return (
    <ColourTiles kind="sets">
      {sets.map(({ id, name, colours }) => (
        <SetTile
          key={id}
          name={name}
          paint={`linear-gradient(90deg, ${colours.join(', ')})`}
          isPicked={current === colourKey(colours)}
          onPick={() => pick(colours)}
        />
      ))}
    </ColourTiles>
  );
}

const isColourControl = ({ type }: Parameter) => type === 'color_picker' || type === 'palette';

export function LightCardSheet({ light, room }: { light: Light; room: Room }) {
  const recording = usePaint(light);
  const lookName = lookNameOf(light);
  const control = currentControls(light).find(isColourControl);
  const isLit = isAnyOn([light]);
  return (
    <CardLayout
      name={light.name}
      subtitle={lookName ? `${room.name} · ${lookName}` : room.name}
      tint={recording?.tint}
      power={<OneLightSwitch light={light} />}
      strip={
        <LookStrip
          source={previewOfAnimation(light.animation ?? null)}
          shape="tile"
          isOn={isLit}
          brightness={light.brightness}
        />
      }
      level={
        <LevelLine
          label="Brightness"
          level={light.brightness}
          isLit={isLit}
          disabled={isUnreachable(light)}
          onLevel={(next) => setBrightness([light], next)}
        />
      }
      colours={
        control ? (
          <ColourChoices light={light} control={control} />
        ) : (
          <NoColours>{`${light.name} has no colours to pick. Change the look to pick one.`}</NoColours>
        )
      }
      onClose={closeCard}
      onChangeLook={() => openPage('looks', room.id, light.address)}
      onControls={() => openPage('controls', room.id, light.address)}
    />
  );
}
