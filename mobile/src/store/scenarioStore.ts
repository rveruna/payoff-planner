import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { Pence } from '@domain/money';
import { DEFAULT_SCENARIO, MAX_DEBTS, MAX_EXTRA, parseScenario, scenarioToSearch } from '@domain/scenario';
import type { Debt, Strategy } from '@domain/types';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from './settings';
import { storage } from './storage';

export const STORAGE_KEY = 'payoff-planner';

export interface NewDebt {
  name: string;
  balance: Pence;
  aprBp: number;
  minPayment: Pence;
}

interface State {
  debts: Debt[];
  extra: Pence;
  strategy: Strategy;
  settings: Settings;
  /** True once what was saved on the device has been read. */
  hydrated: boolean;

  addDebt: (debt: NewDebt) => string | null;
  updateDebt: (id: string, patch: Partial<NewDebt>) => void;
  removeDebt: (id: string) => void;
  setExtra: (extra: Pence) => void;
  setStrategy: (strategy: Strategy) => void;
  /** Replaces the debts, the extra and the strategy, for example from a shared link. */
  replaceScenario: (scenario: { debts: Debt[]; extra: Pence; strategy: Strategy }) => void;
  resetToSample: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Removes every debt and puts the settings back to their defaults. */
  clearAll: () => void;
}

/** A debt's id only has to be different from the others while the app is open; it is not saved. */
let counter = 0;
const nextId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * The store, built over whatever storage it is given. On a phone that is async secure storage; in a browser it is localStorage,
 * which answers at once. Taking the storage as an argument lets a test try both.
 */
export function createScenarioStore(backing: StateStorage) {
  const store = create<State>()(
    persist(
      (set, get) => ({
        debts: DEFAULT_SCENARIO.debts,
        extra: DEFAULT_SCENARIO.extra,
        strategy: DEFAULT_SCENARIO.strategy,
        settings: DEFAULT_SETTINGS,
        hydrated: false,

        addDebt: (debt) => {
          if (get().debts.length >= MAX_DEBTS) return null;
          const id = nextId();
          set((s) => ({ debts: [...s.debts, { id, ...debt }] }));
          return id;
        },
        updateDebt: (id, patch) =>
          set((s) => ({ debts: s.debts.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
        removeDebt: (id) => set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),
        setExtra: (extra) => set({ extra: Math.min(Math.max(0, Math.round(extra)), MAX_EXTRA) }),
        setStrategy: (strategy) => set({ strategy }),
        replaceScenario: ({ debts, extra, strategy }) => set({ debts, extra, strategy }),
        resetToSample: () => set({ debts: DEFAULT_SCENARIO.debts, extra: DEFAULT_SCENARIO.extra }),
        updateSettings: (patch) => set((s) => ({ settings: parseSettings({ ...s.settings, ...patch }) })),
        clearAll: () => set({ debts: [], extra: 0, strategy: 'avalanche', settings: DEFAULT_SETTINGS }),
      }),
      {
        name: STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => backing),
        // Only what the person chose is saved. The scenario is saved in the same text form as a shared link.
        partialize: (s) => ({
          scenario: scenarioToSearch({ debts: s.debts, extra: s.extra, strategy: s.strategy, start: null }),
          settings: s.settings,
        }),
        // What was saved is read back through the same defensive parsers as a link, so old or damaged data cannot crash the app.
        merge: (saved, current) => {
          const stored = (saved ?? {}) as { scenario?: unknown; settings?: unknown };
          const search = typeof stored.scenario === 'string' ? stored.scenario : '';
          const scenario = parseScenario(search);
          // a deliberately empty list is saved as an empty value and stays empty; saved debts that cannot be read at all
          // are damage, so the sample is shown rather than a confusing empty app
          const hadDebts = new URLSearchParams(search).getAll('d').some((value) => value !== '');
          const debts = scenario.debts.length === 0 && hadDebts ? DEFAULT_SCENARIO.debts : scenario.debts;
          return {
            ...current,
            debts,
            extra: scenario.extra,
            strategy: scenario.strategy,
            settings: parseSettings(stored.settings),
          };
        },
        // With storage that answers at once, loading finishes while the store is still being built, before it can be
        // referred to. Waiting one tick makes the same code right for both kinds of storage.
        onRehydrateStorage: () => () => {
          queueMicrotask(() => store.setState({ hydrated: true }));
        },
      },
    ),
  );
  return store;
}

export const useScenarioStore = createScenarioStore(storage);
