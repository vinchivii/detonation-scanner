import { SavedScanProfile, WatchlistItem } from './types';

/**
 * Local Storage Helper for Detonation Scanner
 * 
 * Provides safe localStorage access with SSR guards and JSON serialization.
 * All data is stored in browser localStorage with namespaced keys.
 */

const isBrowser = typeof window !== 'undefined';

function safeGetItem<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Fail silently - could be quota exceeded or other storage error
  }
}

export const storage = {
  /**
   * Get all saved scan profiles
   */
  getSavedScans(): SavedScanProfile[] {
    return safeGetItem<SavedScanProfile[]>('detonationScanner.savedScans', []);
  },

  /**
   * Save scan profiles to storage
   */
  setSavedScans(value: SavedScanProfile[]): void {
    safeSetItem('detonationScanner.savedScans', value);
  },

  /**
   * Get all watchlist items
   */
  getWatchlist(): WatchlistItem[] {
    return safeGetItem<WatchlistItem[]>('detonationScanner.watchlist', []);
  },

  /**
   * Save watchlist items to storage
   */
  setWatchlist(value: WatchlistItem[]): void {
    safeSetItem('detonationScanner.watchlist', value);
  },
};
