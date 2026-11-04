import { ChoiceList, Overlay, OverlayText } from '../../composites';
import { KeyRow, TextKey } from '../../design-system';
import { removeSchedule, writeSchedule, type Light } from '../store/fleet-store';
import type { Room } from '../store/rooms';
import { hasScheduleSpace, offTimerNote, offTimersOf, timeOfDay, timerEntry } from '../store/schedules';
import { offerUndo, showNotice } from '../store/undo';

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

  const start = (minutes: string, close: () => void) => {
    cancelTimers(lights);
    const entry = timerEntry(Number(minutes));
    writeSchedule(lights, entry);
    offerUndo({
      text: `${room.name} goes off at ${timeOfDay(entry.at_utc ?? 0)}`,
      moments: [],
      restore: () => removeSchedule(lights, entry.id),
    });
    close();
  };

  const cancel = (close: () => void) => {
    cancelTimers(lights);
    showNotice(`${room.name} stays on`);
    close();
  };

  return (
    <Overlay
      label="Off timer"
      onClose={onClose}
      actions={(close) => (
        <KeyRow>
          <TextKey isQuiet onClick={close}>
            CLOSE
          </TextKey>
          {isWaiting && <TextKey onClick={() => cancel(close)}>CANCEL TIMER</TextKey>}
        </KeyRow>
      )}
    >
      {(close) => (
        <>
          {isWaiting && <OverlayText>{offTimerNote(lights)}.</OverlayText>}
          {hasSpace ? (
            <ChoiceList label="Off in" choices={LENGTHS} chosen={[]} onChoose={(minutes) => start(minutes, close)} />
          ) : (
            <OverlayText>These lights hold all the schedules they can. Remove one in Schedules first.</OverlayText>
          )}
        </>
      )}
    </Overlay>
  );
}
