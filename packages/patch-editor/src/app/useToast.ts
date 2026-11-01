/** The one line of feedback along the bottom of the editor. */

import { useCallback, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  const say = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(t => (t === m ? null : t)), 2600);
  }, []);

  return { toast, say };
}
