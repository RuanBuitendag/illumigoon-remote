import { ChoiceList, Overlay, OverlayText } from '../../composites';
import { KeyRow, TextKey } from '../../design-system';
import { removeSchedule, writeSchedule, type Light } from '../store/fleet-store';
import type { Room } from '../store/rooms';
import { hasScheduleSpace, offTimerNote, offTimersOf, timerEntry } from '../store/schedules';

const LENGTHS = [
  { id: '15', name: '15 minutes' },
  { id: '30', name: '30 minutes' },
  { id: '60', name: '1 hour' },
  { id: '120', name: '2 hours' },
];

export const schedulingLights = ({ writableLights }: Room) => writableLights.filter((light) => light.canSchedule);

function cancelTimers(lights: Light[]) {
  for (const { id } of offTimersOf(lights)) {
    removeSchedule(lights.filter(({ schedule }) => schedule.some((entry) => entry.id === id)), id);
  }
}

// One timer for a room: a new one takes the place of the one waiting.
export function OffTimerSheet({ room, onClose }: { room: Room; onClose: () => void }) {
  const lights = schedulingLights(room);
  const isWaiting = offTimersOf(lights).length > 0;
  const hasSpace = isWaiting || hasScheduleSpace(lights);

  const start = (minutes: string) => {
    cancelTimers(lights);
    writeSchedule(lights, timerEntry(Number(minutes)));
    onClose();
  };

  const cancel = () => {
    cancelTimers(lights);
    onClose();
  };

  return (
    <Overlay label="Off timer">
      {isWaiting && <OverlayText>{offTimerNote(lights)}.</OverlayText>}
      {hasSpace ? (
        <ChoiceList choices={LENGTHS} value="" onChange={start} />
      ) : (
        <OverlayText>These lights hold all the schedules they can. Remove one in Schedules first.</OverlayText>
      )}
      <KeyRow>
        <TextKey isQuiet onClick={onClose}>
          CLOSE
        </TextKey>
        {isWaiting && <TextKey onClick={cancel}>CANCEL TIMER</TextKey>}
      </KeyRow>
    </Overlay>
  );
}
