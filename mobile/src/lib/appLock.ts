import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

/** How long the app can be in the background before it asks again. */
export const RELOCK_AFTER_MS = 60_000;

interface LockState {
  unlocked: boolean;
  setUnlocked: (unlocked: boolean) => void;
}

export const useLockState = create<LockState>((set) => ({
  unlocked: false,
  setUnlocked: (unlocked) => set({ unlocked }),
}));

/** Whether this device can unlock with a fingerprint, face or its passcode. There is no such thing in a browser. */
export async function lockAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

/** Asks the system to check who is holding the phone. True only if it says yes. */
export async function authenticate(prompt = 'Unlock Payoff Planner'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * The lock around the whole app. When the lock is turned on the app starts locked, and it locks again after a minute in
 * the background. Nothing is shown, not even the debts, until the person has been checked.
 */
export function useAppLock(enabled: boolean) {
  const unlocked = useLockState((s) => s.unlocked);
  const setUnlocked = useLockState((s) => s.setUnlocked);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt.current = Date.now();
      if (state === 'active' && leftAt.current !== null) {
        if (Date.now() - leftAt.current > RELOCK_AFTER_MS) setUnlocked(false);
        leftAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled, setUnlocked]);

  return {
    locked: enabled && !unlocked,
    unlock: async () => {
      if (await authenticate()) setUnlocked(true);
    },
  };
}
