import { init } from '@sentry/react';
import { APP_VERSION } from './app-update/app-update';

// Errors in the installed app go to Sentry, which emails a new kind of error at once. The key is
// public by Sentry's design and comes from `.env.production`. With no key, or on the dev server,
// nothing is sent.
const SENTRY_KEY: string | undefined = import.meta.env.VITE_SENTRY_DSN;

export function startErrorReports() {
  if (!SENTRY_KEY || import.meta.env.DEV) return;
  init({ dsn: SENTRY_KEY, release: APP_VERSION });
}
