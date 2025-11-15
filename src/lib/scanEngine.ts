import { ScanRequest, ScanResult } from './types';
import { getMarketDataProvider } from './dataProvider';
import { appConfig } from './config';

/**
 * Main Scan Engine Entry Point
 * 
 * This module provides the public API for running stock scans.
 * Internally, it delegates to the appropriate data provider based on
 * the configured data mode (mock or live).
 * 
 * The UI layer calls this function without needing to know whether
 * data comes from mocks or real APIs.
 */

/**
 * Run a stock scan based on the provided request
 * 
 * @param request - The scan configuration including mode and filters
 * @returns Promise resolving to an array of scan results
 * 
 * @example
 * ```ts
 * const results = await runScan({
 *   mode: 'catalyst-hunter',
 *   filters: {
 *     marketCap: 'small',
 *     sectors: ['Biotech'],
 *     minVolume: 1000000
 *   }
 * });
 * ```
 */
export async function runScan(request: ScanRequest): Promise<ScanResult[]> {
  const provider = getMarketDataProvider(appConfig.dataMode);
  return provider.runScan(request);
}
