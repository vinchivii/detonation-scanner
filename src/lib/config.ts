/**
 * Application Configuration
 * 
 * Centralizes runtime settings for Detonation Scanner.
 */

/**
 * Data mode determines whether the app uses mock data or live market APIs
 */
export type DataMode = 'mock' | 'live';

/**
 * Main application configuration
 * 
 * The app now runs exclusively in live mode with real market data.
 */
export const appConfig = {
  dataMode: 'live' as DataMode,
};

/**
 * Storage key for persisting user's selected data mode
 */
export const DATA_MODE_STORAGE_KEY = 'detonationScanner.dataMode';
