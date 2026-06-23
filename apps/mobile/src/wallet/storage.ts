import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tiny async key/value wrapper around AsyncStorage (which itself falls back to
 * localStorage on web). Kept behind one module so the persistence backend can be
 * swapped for secure storage on device builds without touching callers.
 */
export const storage = {
  get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  set(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  },
  remove(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  },
};
