import { startAppUpdate } from './app-update/app-update';
import { startFleet } from './store/fleet-store';
import { keepHistory } from './store/screen-history';

export function startApp() {
  startAppUpdate();
  keepHistory();
  // `?demo` on the dev server shows made-up lights and talks to no real ones.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
    void import('./store/demo-fleet').then(({ startDemoFleet }) => startDemoFleet());
  } else {
    startFleet();
  }
}

// `?components` on the dev server: every component of the two doors, and no lights (D68). The release
// build drops it, because src/main.tsx asks for it only under `import.meta.env.DEV`.
export const loadComponentPage = () =>
  import('./screens/component-page/component-page').then(({ ComponentPage }) => ComponentPage);
