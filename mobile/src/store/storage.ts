import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

/** On a phone the debts are kept in the system's secure storage (the Keychain on iOS, the Keystore on Android). */
export const storage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};
