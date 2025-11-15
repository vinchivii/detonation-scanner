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
 * TODO: In a future phase, dataMode could be set from:
 * - Environment variable: process.env.NEXT_PUBLIC_DATA_MODE
 * - User settings toggle in a settings page
 * - Runtime configuration API
 * 
 * Note: appConfig.dataMode serves as the DEFAULT fallback mode.
 * The actual runtime mode is stored in localStorage and controlled
 * by UI state, allowing users to switch between mock and live data
 * without code changes.
 */
export const appConfig = {
  dataMode: 'mock' as DataMode,
};

/**
 * Storage key for persisting user's selected data mode
 */
export const DATA_MODE_STORAGE_KEY = 'detonationScanner.dataMode';
