import { useState } from 'react';
import { Overlay, OverlayText, WhichLights } from '../../composites';
import { KeyRow, TextKey } from '../../design-system';
import type { Room } from '../store/rooms';

type WhichLightsSheetProps = {
  rooms: Room[];
  picked: string[];
  onDone: (picked: string[]) => void;
  onClose: () => void;
};

// A silent or locked light cannot take a look, so it cannot be picked.
export function WhichLightsSheet({ rooms, picked, onDone, onClose }: WhichLightsSheetProps) {
  const [chosen, setChosen] = useState(picked);
  const shownRooms = rooms
    .map(({ id, name, writableLights }) => ({
      id,
      name,
      lights: writableLights.map(({ address, name: lightName }) => ({ id: address, name: lightName })),
    }))
    .filter(({ lights }) => lights.length > 0);

  const toggle = (id: string) =>
    setChosen(chosen.includes(id) ? chosen.filter((address) => address !== id) : [...chosen, id]);

  return (
    <Overlay
      label="Which lights"
      actions={
        <KeyRow>
          <TextKey isQuiet onClick={onClose}>
            CANCEL
          </TextKey>
          <TextKey onClick={() => setChosen(shownRooms.flatMap(({ lights }) => lights.map(({ id }) => id)))}>
            EVERY LIGHT
          </TextKey>
          <TextKey disabled={chosen.length === 0} onClick={() => onDone(chosen)}>
            DONE
          </TextKey>
        </KeyRow>
      }
    >
      {shownRooms.length === 0 && <OverlayText>No light can take a look right now.</OverlayText>}
      <WhichLights rooms={shownRooms} picked={chosen} onToggle={toggle} />
    </Overlay>
  );
}
