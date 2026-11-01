/**
 * How many LEDs the preview shades.
 *
 * On its own so drawing a strip does not load the engine: `ledPaint.ts` needs this number and
 * nothing else from here, and `engine.ts` only loads under Vite.
 *
 * 90 BECAUSE NOTHING SAYS OTHERWISE. The length lives in NVS (`led_physical`, and the active
 * range in `led_count`) and no message the editor already receives carries it -- the heartbeat's
 * `room_count` is how many lights share a room, not how long this one is. Asking would take a
 * `device_config_get`, which is a question to the light rather than listening to it, so this is
 * `LED_COUNT_DEFAULT` until the heartbeat grows a field. Footprint scales with it, so a longer
 * strip really would shade differently.
 */
export const PREVIEW_PIXELS = 90;
