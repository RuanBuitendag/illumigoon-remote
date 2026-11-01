import { start } from '@illumigoon/patch-editor/sidecar';

// The laptop's helper for the dev server: finds lights and holds the patch files.
await start({ port: 5174 });