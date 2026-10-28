import { useSyncExternalStore } from 'react';

function subscribeClass(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}

/** True while the dark theme class is on <html>; updates after the class changes. */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribeClass,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  );
}

function mediaStore(query: string) {
  const get = () => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  };
  const subscribe = (cb: () => void) => {
    try {
      const mql = window.matchMedia(query);
      mql.addEventListener?.('change', cb);
      return () => mql.removeEventListener?.('change', cb);
    } catch {
      return () => {};
    }
  };
  return { get, subscribe };
}

const reduced = mediaStore('(prefers-reduced-motion: reduce)');
const stores = new Map<string, ReturnType<typeof mediaStore>>();

/** True while a media query matches. */
export function useMediaQuery(query: string): boolean {
  let store = stores.get(query);
  if (!store) {
    store = mediaStore(query);
    stores.set(query, store);
  }
  return useSyncExternalStore(store.subscribe, store.get, () => false);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
}
