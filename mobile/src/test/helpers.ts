import * as SecureStore from 'expo-secure-store';
import { DEFAULT_SCENARIO } from '@domain/scenario';
import { useLockState } from '@/lib/appLock';
import { DEFAULT_SETTINGS } from '@/store/settings';
import { STORAGE_KEY, useScenarioStore } from '@/store/scenarioStore';

/** The in-memory stand-in for secure storage, so a test can see and set what is saved. */
export const saved = (SecureStore as unknown as { __data: Map<string, string> }).__data;

/** Puts the store and the saved data back to a fresh install, ready for the next test. */
export function resetStore() {
  jest.clearAllMocks();
  useLockState.setState({ unlocked: false });
  saved.clear();
  useScenarioStore.setState({
    debts: DEFAULT_SCENARIO.debts,
    extra: DEFAULT_SCENARIO.extra,
    strategy: DEFAULT_SCENARIO.strategy,
    settings: DEFAULT_SETTINGS,
    hydrated: true,
  });
}

/** What was last saved, as the plain object it was written as. */
export function savedState(): { state: { scenario: string; settings: unknown }; version: number } | null {
  const raw = saved.get(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}
