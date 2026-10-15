import type { StateStorage } from 'zustand/middleware';

/** In a browser there is no secure storage, so the web demo keeps its data in localStorage, in that browser only. */
export const storage: StateStorage = {
  getItem: (name) => globalThis.localStorage?.getItem(name) ?? null,
  setItem: (name, value) => globalThis.localStorage?.setItem(name, value),
  removeItem: (name) => globalThis.localStorage?.removeItem(name),
};
