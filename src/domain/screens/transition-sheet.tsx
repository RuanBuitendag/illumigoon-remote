import { ControlList, PageFrame, SelectRow, SliderRow } from '../../composites';
import { TextKey } from '../../design-system';
import { applyLook, setTransition, type Light } from '../store/fleet-store';
import { closePage, useBackLabel } from '../store/navigation-store';
import { lookNameOf, type Room } from '../store/rooms';

const MAX_TRANSITION_SECONDS = 10;

export const transitionLights = ({ writableLights }: Room) =>
  writableLights.filter(({ transitions }) => transitions.length > 0);

const styleOf = ({ transitionId, transitions }: Light) => transitionId ?? transitions[0]?.id ?? '';
const secondsOf = ({ transitionMs }: Light) => (transitionMs ?? 0) / 1000;

// The slider is squared, so the short lengths most people pick get most of its travel.
const positionOf = (seconds: number) => Math.sqrt(seconds / MAX_TRANSITION_SECONDS);
const secondsAt = (position: number) => Math.round(position * position * MAX_TRANSITION_SECONDS * 10) / 10;

export function transitionNote(light: Light) {
  const style = light.transitions.find(({ id }) => id === styleOf(light));
  return `${style?.name ?? ''}, ${secondsOf(light).toFixed(1)} s`;
}

// Each light takes its own look again, so it shows the transition into it.
function playTransition(lights: Light[]) {
  for (const light of lights) {
    if (light.isOn && light.animation) applyLook([light], lookNameOf(light) ?? '', light.animation);
  }
}

function TransitionControls({ lights, light }: { lights: Light[]; light: Light }) {
  const id = styleOf(light);
  const seconds = secondsOf(light);
  return (
    <ControlList>
      <SelectRow
        label="Style"
        options={light.transitions.map(({ id: value, name }) => ({ value, name }))}
        value={id}
        onChange={(next) => setTransition(lights, next, seconds * 1000)}
      />
      <SliderRow
        label="Length"
        valueText={`${seconds.toFixed(1)} s`}
        value={positionOf(seconds)}
        min={0}
        max={1}
        step={0.01}
        onChange={(next) => setTransition(lights, id, secondsAt(next) * 1000)}
      />
      {lights.some(({ isOn }) => isOn) && <TextKey onClick={() => playTransition(lights)}>TRY IT</TextKey>}
    </ControlList>
  );
}

export function TransitionPage({ room }: { room: Room }) {
  const lights = transitionLights(room);
  const light = lights[0];
  return (
    <PageFrame title="Transition" backLabel={useBackLabel(room)} onBack={closePage}>
      {light && <TransitionControls lights={lights} light={light} />}
    </PageFrame>
  );
}
