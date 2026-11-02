import { useEffect } from 'react';
import { FLASH_MS } from '../store/fleet-store';

// `flash` must stay the same function between renders, or the light is asked again each time.
export function useFlash(flash: (isOn: boolean) => void, isFlashing: boolean) {
  useEffect(() => {
    if (!isFlashing) return;
    flash(true);
    const renewal = window.setInterval(() => flash(true), FLASH_MS / 2);
    return () => {
      window.clearInterval(renewal);
      flash(false);
    };
  }, [flash, isFlashing]);
}
