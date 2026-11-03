import { useState } from 'react';
import { PageFrame, PageHint, PageSection, StateCard, StateList } from '../../composites';
import type { SceneLight } from '../store/library-store';
import { endPreview, previewScene } from '../store/look-preview';
import { closePage } from '../store/navigation-store';
import type { Room } from '../store/rooms';
import { applyScene, sceneSummary } from '../store/scenes';
import { useStateHistory, type HouseState } from '../store/state-history';
import { SaveSceneSheet } from './save-scene-sheet';
import { SceneLights } from './scene-row';

const timeOf = ({ at }: HouseState) =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

export function HistoryPage({ rooms }: { rooms: Room[] }) {
  const states = useStateHistory((history) => history.states);
  const [keeping, setKeeping] = useState<SceneLight[] | null>(null);
  return (
    <PageFrame
      title="Recent"
      intro="The last 10 states of the house. Tap to go back. Hold to try."
      backLabel="Rooms"
      onBack={closePage}
    >
      {states.length === 0 && (
        <PageSection>
          <PageHint>Nothing yet. Change a light, and it shows here.</PageHint>
        </PageSection>
      )}
      <StateList>
        {states.map((state, index) => (
          <StateCard
            key={state.id}
            name={index === 0 ? 'Now' : timeOf(state)}
            summary={sceneSummary(state, rooms)}
            onApply={() => applyScene({ name: 'Earlier state', lights: state.lights }, rooms)}
            onHold={() => previewScene({ name: '', lights: state.lights }, rooms)}
            onHoldEnd={endPreview}
            onKeep={() => setKeeping(state.lights)}
          >
            <SceneLights lights={state.lights} />
          </StateCard>
        ))}
      </StateList>
      {keeping && (
        <SaveSceneSheet rooms={rooms} keeping={keeping} renaming={null} onClose={() => setKeeping(null)} />
      )}
    </PageFrame>
  );
}
