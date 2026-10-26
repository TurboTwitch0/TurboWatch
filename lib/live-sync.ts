export interface RefreshQueue {
  request: (immediate?: boolean) => Promise<void>;
  dispose: () => void;
}

/** Serialize snapshots and combine bursts of database events into one read. */
export function createRefreshQueue(refresh: () => Promise<void>, debounceMs = 100): RefreshQueue {
  let disposed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let waiting: { resolve: () => void; reject: (cause: unknown) => void }[] = [];

  const flush = async () => {
    timer = null;
    if (disposed || running || waiting.length === 0) return;
    running = true;
    const batch = waiting;
    waiting = [];
    try {
      await refresh();
      batch.forEach(({ resolve }) => resolve());
    } catch (cause) {
      batch.forEach(({ reject }) => reject(cause));
    } finally {
      running = false;
      if (!disposed && waiting.length > 0) timer = setTimeout(() => { void flush(); }, debounceMs);
    }
  };

  return {
    request(immediate = false) {
      if (disposed) return Promise.resolve();
      const promise = new Promise<void>((resolve, reject) => { waiting.push({ resolve, reject }); });
      if (!running) {
        if (immediate && timer) { clearTimeout(timer); timer = null; }
        if (immediate) void flush();
        else if (!timer) timer = setTimeout(() => { void flush(); }, debounceMs);
      }
      return promise;
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      waiting.forEach(({ resolve }) => resolve());
      waiting = [];
    },
  };
}

/** Keep unchanged entities/arrays stable so polling does not remount media. */
export function reconcileRows<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  const byId = new Map(previous.map((row) => [row.id, row]));
  const reconciled = incoming.map((row) => {
    const old = byId.get(row.id);
    return old && JSON.stringify(old) === JSON.stringify(row) ? old : row;
  });
  return reconciled.length === previous.length && reconciled.every((row, index) => row === previous[index]) ? previous : reconciled;
}

export function sameStrings(previous: string[], incoming: string[]): string[] {
  return previous.length === incoming.length && previous.every((value, index) => value === incoming[index]) ? previous : incoming;
}
