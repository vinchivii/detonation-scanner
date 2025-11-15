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
 * For now, it remains hardcoded to 'mock' to ensure stable behavior
 * while we build out the infrastructure for live data integration.
 */
export const appConfig = {
  dataMode: 'mock' as DataMode,
};
