import { useState } from 'react';
import { Overlay, OverlayText, WhichLights } from '../../composites';
import { KeyRow, TextKey } from '../../design-system';
import { patchLights, type Room } from '../store/rooms';

type WhichLightsSheetProps = {
  rooms: Room[];
  room: Room | undefined;
  picked: string[];
  onDone: (picked: string[]) => void;
  onClose: () => void;
};

// Only lights that can play the looks on the page, and a silent or locked light cannot take one.
const shownRoomsOf = (rooms: Room[]) =>
  rooms
    .map(({ id, name, writableLights }) => ({
      id,
      name,
      lights: patchLights(writableLights).map(({ address, name: lightName }) => ({ id: address, name: lightName })),
    }))
    .filter(({ lights }) => lights.length > 0);

// The rows are the ones there when the sheet opened, so a light that answers meanwhile moves no tap.
export function WhichLightsSheet({ rooms, room, picked, onDone, onClose }: WhichLightsSheetProps) {
  const [shownRooms] = useState(() => shownRoomsOf(rooms));
  const listed = shownRooms.flatMap(({ lights }) => lights.map(({ id }) => id));
  const [chosen, setChosen] = useState(() => picked.filter((address) => listed.includes(address)));
  const thisRoom = shownRooms.find(({ id }) => id === room?.id);

  const toggle = (id: string) =>
    setChosen(chosen.includes(id) ? chosen.filter((address) => address !== id) : [...chosen, id]);

  return (
    <Overlay
      label="Which lights"
      onClose={onClose}
      actions={(close) => (
        <KeyRow>
          <TextKey isQuiet onClick={close}>
            CANCEL
          </TextKey>
          <TextKey
            disabled={chosen.length === 0}
            onClick={() => {
              onDone(chosen);
              close();
            }}
          >
            DONE
          </TextKey>
        </KeyRow>
      )}
    >
      {shownRooms.length === 0 && <OverlayText>No light can take a look right now.</OverlayText>}
      {shownRooms.length > 0 && (
        <KeyRow>
          {thisRoom && (
            <TextKey onClick={() => setChosen(thisRoom.lights.map(({ id }) => id))}>
              {`ONLY ${thisRoom.name.toUpperCase()}`}
            </TextKey>
          )}
          <TextKey onClick={() => setChosen(listed)}>EVERY LIGHT</TextKey>
        </KeyRow>
      )}
      <WhichLights rooms={shownRooms} picked={chosen} onToggle={toggle} />
    </Overlay>
  );
}
