import { Overlay, SelectRow, SliderRow } from '../../composites';
import { TextKey } from '../../design-system';
import { setTransition, type Light } from '../store/fleet-store';
import type { Room } from '../store/rooms';

const MAX_TRANSITION_SECONDS = 10;

export const transitionLights = ({ writableLights }: Room) =>
  writableLights.filter(({ transitions }) => transitions.length > 0);

const styleOf = ({ transitionId, transitions }: Light) => transitionId ?? transitions[0]?.id ?? '';
const secondsOf = ({ transitionMs }: Light) => (transitionMs ?? 0) / 1000;

export function transitionNote(light: Light) {
  const style = light.transitions.find(({ id }) => id === styleOf(light));
  return `${style?.name ?? ''}, ${secondsOf(light).toFixed(1)} s`;
}

export function TransitionSheet({ lights, onClose }: { lights: Light[]; onClose: () => void }) {
  const light = lights[0];
  if (!light) return null;
  const id = styleOf(light);
  const seconds = secondsOf(light);
  return (
    <Overlay
      label="Transition"
      actions={
        <TextKey isQuiet onClick={onClose}>
          CLOSE
        </TextKey>
      }
    >
      <SelectRow
        label="Style"
        options={light.transitions.map(({ id: value, name }) => ({ value, name }))}
        value={id}
        onChange={(next) => setTransition(lights, next, seconds * 1000)}
      />
      <SliderRow
        label="Length"
        valueText={`${seconds.toFixed(1)} s`}
        value={seconds}
        min={0}
        max={MAX_TRANSITION_SECONDS}
        step={0.1}
        onChange={(next) => setTransition(lights, id, next * 1000)}
      />
    </Overlay>
  );
}
