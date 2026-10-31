import { startAppUpdate } from './app-update/app-update';
import { startFleet } from './store/fleet-store';

export function startApp() {
  startAppUpdate();
  // `?demo` on the dev server shows made-up lights and talks to no real ones.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
    void import('./store/demo-fleet').then(({ startDemoFleet }) => startDemoFleet());
  } else {
    startFleet();
  }
}
