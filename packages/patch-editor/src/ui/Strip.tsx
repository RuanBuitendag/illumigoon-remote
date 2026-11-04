/**
 * The light, drawn beside the knobs: one cell per LED, rendered by the real patch engine.
 *
 * Full width under the Edit header, because it stands for the strip -- the thing every control
 * below it is changing -- and a strip is long and thin. Lit tape from `ledPaint.ts`, like the
 * phone's large strip.
 *
 * Painted by the shared loop in `live.ts`, never by React, for the reason that file gives:
 * a render of the whole editor per frame to repaint ninety cells is how the meters stuttered.
 * React draws only the status line, which changes a handful of times a session.
 *
 * WHAT IT SAYS ABOUT ITSELF is not decoration. A preview that looked like the strip and quietly
 * was not -- a different firmware's engine, an audio patch sitting silent -- would be worse
 * than none, so each of those is said where the strip is.
 */

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createLedPainter, readRgba, type LedShape } from './ledPaint';
import { onFrame } from './live';
import {
  PREVIEW_PIXELS, previewStatus, renderPreview, subscribePreview,
} from '../engine/preview';

/** Hex the way a person compares two hashes: fixed width, so a mismatch lines up. */

const TAPE: LedShape = { padding: 20, spread: 5, chip: 3.4, glow: 1.25 };

/** What stands in for the strip while the engine is not running. */
function StripEmpty({ status }: { status: ReturnType<typeof previewStatus> }) {
  return (
    <div className="stripcells stripempty">
      {status.at === 'loading' && 'starting the engine…'}
      {/* "then reload", because a module built mid-session arrives by hot update as a
          fresh copy of `preview.ts`, and the open socket is still feeding the old one. */}
      {status.at === 'missing' && 'engine not built — npm run engine:build, then reload'}
      {status.at === 'failed' && `the engine would not start: ${status.why}`}
    </div>
  );
}

export function Strip({ deviceCatalogHash, meter, head }: {
  deviceCatalogHash?: number;
  /** Beside what the strip says about itself, for what must be seen while editing. */
  meter?: ReactNode;
  /** Over the strip on every section: which light is live, and undo. */
  head?: ReactNode;
}) {
  const status = useSyncExternalStore(subscribePreview, previewStatus);
  const cells = useRef<HTMLCanvasElement | null>(null);

  const running = status.at === 'running';

  useEffect(() => {
    const out = cells.current;
    if (!running || !out) return;
    const { pixels, paint } = createLedPainter(out, TAPE);
    const rgba = new Uint8ClampedArray(PREVIEW_PIXELS * 4);
    const stop = onFrame(t => {
      if (!renderPreview(t, rgba)) return;
      readRgba(pixels, rgba);
      paint();
    });
    return stop;
  }, [running]);

  const mismatch = running && deviceCatalogHash !== undefined
    && status.catalogHash !== deviceCatalogHash >>> 0;

  return (
    <div className="strip">
      {(mismatch || meter || head) && (
        <div className="striphead">
          {head}
          {meter}
          {mismatch && (
            <span className="stripwarn">
              this engine is not this light&rsquo;s software
            </span>
          )}
        </div>
      )}

      <div className="stripbox">
        {running ? (
            <canvas ref={cells} className="stripcells" />
        ) : (
          <StripEmpty status={status} />
        )}
      </div>
    </div>
  );
}
