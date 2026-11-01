import { useState } from 'react';
import { Overlay, OverlayText, WhichLights } from '../../composites';
import { KeyRow, TextKey } from '../../design-system';
import type { AnimationState } from '../light-network/protocol';
import { sendInTurn } from '../store/edit-follow';
import { canPlay, useRooms } from '../store/rooms';

type WhichLightsSheetProps = {
  lookName: string;
  look: AnimationState;
  // The light being edited takes a look by LOAD, which keeps the editor in step with it.
  editedAddress: string | undefined;
  onClose: () => void;
};

export function WhichLightsSheet({ lookName, look, editedAddress, onClose }: WhichLightsSheetProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const rooms = useRooms()
    .map(({ id, name, onlineLights }) => ({
      id,
      name,
      lights: onlineLights
        .filter((light) => light.address !== editedAddress && canPlay(light, look))
        .map((light) => ({ ...light, id: light.address })),
    }))
    .filter(({ lights }) => lights.length > 0);

  const toggle = (id: string) =>
    setPicked(picked.includes(id) ? picked.filter((address) => address !== id) : [...picked, id]);

  const send = () => {
    const lights = rooms.flatMap((room) => room.lights).filter(({ address }) => picked.includes(address));
    sendInTurn(lights, lookName, look);
    onClose();
  };

  return (
    <Overlay label={`Send ${lookName}`}>
      {rooms.length === 0 && <OverlayText>No other light can take this look right now.</OverlayText>}
      <WhichLights rooms={rooms} picked={picked} onToggle={toggle} />
      <KeyRow>
        <TextKey isQuiet onClick={onClose}>
          CANCEL
        </TextKey>
        <TextKey disabled={picked.length === 0} onClick={send}>
          SEND
        </TextKey>
      </KeyRow>
    </Overlay>
  );
}
