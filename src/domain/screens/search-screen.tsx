import { SearchLayout } from '../../composites';
import { TextKey } from '../../design-system';
import { SCAN_PREVIEW } from '../looks/recordings';
import { searchAgain, useFleet } from '../store/fleet-store';
import { LookStrip } from './look-strip';

export function SearchScreen() {
  const hasSearched = useFleet((fleet) => fleet.hasSearched);
  const strip = <LookStrip source={SCAN_PREVIEW} shape="room" />;
  if (!hasSearched) return <SearchLayout strip={strip} text="Looking for lights." />;
  return (
    <SearchLayout strip={strip} text="No lights found. Check that this phone is on the home Wi-Fi.">
      <TextKey onClick={searchAgain}>SEARCH AGAIN</TextKey>
    </SearchLayout>
  );
}
