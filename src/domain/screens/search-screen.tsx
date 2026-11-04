import { SearchLayout } from '../../composites';
import { ActionKey } from '../../design-system';
import { APP_VERSION, useUpdateError } from '../app-update/app-update';
import { SCAN_PREVIEW } from '../looks/recordings';
import { searchAgain, useFleet } from '../store/fleet-store';
import { openPage } from '../store/navigation-store';
import { LookStrip } from './look-strip';

const REFUSED = {
  text: 'The iPhone stopped the search.',
  hint: 'Turn on Local Network for Illumigoon in Settings, Privacy & Security.',
};
const NOT_FOUND = {
  text: 'No lights found.',
  hint: 'Check the home Wi-Fi, and that Local Network is on for Illumigoon in Settings.',
};

export const SEARCH_REFUSED_TEXT = `${REFUSED.text} ${REFUSED.hint}`;

export function SearchScreen() {
  const hasSearched = useFleet((fleet) => fleet.hasSearched);
  const isRefused = useFleet((fleet) => fleet.isSearchRefused);
  const updateError = useUpdateError((update) => update.message);
  const strip = <LookStrip source={SCAN_PREVIEW} shape="room" />;
  const note = updateError ? `Version ${APP_VERSION}. The update failed: ${updateError}` : `Version ${APP_VERSION}`;
  if (!hasSearched) return <SearchLayout strip={strip} text="Looking for lights." note={note} />;
  const { text, hint } = isRefused ? REFUSED : NOT_FOUND;
  return (
    <SearchLayout strip={strip} text={text} hint={hint} note={note}>
      <ActionKey onClick={searchAgain}>Search again</ActionKey>
      <ActionKey onClick={() => openPage('add-light')}>Add a light</ActionKey>
    </SearchLayout>
  );
}
