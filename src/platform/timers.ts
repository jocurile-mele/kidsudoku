import { useCallback, useEffect, useRef } from "react";

export interface ManagedTimers {
  schedule: (name: string, fn: () => void, delayMs: number) => void;
  cancel: (name: string) => void;
  cancelAll: () => void;
}

/**
 * Named browser timeout registry that cancels replaced timers automatically
 * and cleans up every pending timer on unmount.
 */
export function useManagedTimers(): ManagedTimers {
  const handlesRef = useRef<Map<string, number>>(new Map());

  const cancel = useCallback((name: string) => {
    const id = handlesRef.current.get(name);
    if (id !== undefined) {
      window.clearTimeout(id);
      handlesRef.current.delete(name);
    }
  }, []);

  const schedule = useCallback(
    (name: string, fn: () => void, delayMs: number) => {
      cancel(name);
      const id = window.setTimeout(() => {
        handlesRef.current.delete(name);
        fn();
      }, delayMs);
      handlesRef.current.set(name, id);
    },
    [cancel],
  );

  const cancelAll = useCallback(() => {
    for (const id of handlesRef.current.values()) {
      window.clearTimeout(id);
    }
    handlesRef.current.clear();
  }, []);

  useEffect(() => cancelAll, [cancelAll]);

  return { schedule, cancel, cancelAll };
}
