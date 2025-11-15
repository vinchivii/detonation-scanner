/**
 * Filter Utilities
 * 
 * Provides helpers for normalizing and applying scan filters consistently
 * across mock and live scan engines.
 */

import { ScanFilters, ScanResult } from './types';

/**
 * Normalize filter values to ensure consistency
 * - Handles missing fields with sensible defaults
 * - Swaps min/max if they're in the wrong order
 * - Ensures sectors is always an array
 */
export function normalizeFilters(filters: ScanFilters): ScanFilters {
  const cleaned: ScanFilters = {
    marketCap: filters.marketCap ?? 'any',
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    minVolume: filters.minVolume ?? undefined,
    sectors: filters.sectors ?? [],
  };

  // If both min and max exist and min > max, swap them to avoid invalid ranges
  if (cleaned.minPrice != null && cleaned.maxPrice != null && cleaned.minPrice > cleaned.maxPrice) {
    const temp = cleaned.minPrice;
    cleaned.minPrice = cleaned.maxPrice;
    cleaned.maxPrice = temp;
  }

  return cleaned;
}

/**
 * Build a human-readable summary of active filters
 * Useful for displaying in UI or logging to scan history
 */
export function buildFiltersSummary(filters: ScanFilters): string {
  const f = normalizeFilters(filters);
  
  const capLabel = f.marketCap === 'any' ? 'Any' : f.marketCap.charAt(0).toUpperCase() + f.marketCap.slice(1);
  
  const priceLabel = f.minPrice == null && f.maxPrice == null
    ? 'Any'
    : f.minPrice != null && f.maxPrice != null
    ? `$${f.minPrice}–$${f.maxPrice}`
    : f.minPrice != null
    ? `≥$${f.minPrice}`
    : `≤$${f.maxPrice}`;
  
  const volLabel = f.minVolume == null 
    ? 'Any' 
    : f.minVolume >= 1000000
    ? `${(f.minVolume / 1000000).toFixed(1)}M+`
    : `${f.minVolume}+`;
  
  const sectorsLabel = !f.sectors.length ? 'All' : f.sectors.join(', ');

  return `Cap: ${capLabel} | Price: ${priceLabel} | Vol: ${volLabel} | Sectors: ${sectorsLabel}`;
}

/**
 * Determine market cap bucket from market cap value
 * Used for filtering when we have actual marketCap numbers
 */
export function getMarketCapBucket(marketCap: number): 'micro' | 'small' | 'mid' | 'large' {
  if (marketCap < 300_000_000) return 'micro';
  if (marketCap < 2_000_000_000) return 'small';
  if (marketCap < 10_000_000_000) return 'mid';
  return 'large';
}

/**
 * Apply filters to a single scan result
 * Returns true if the result passes all active filters
 */
export function resultPassesFilters(result: ScanResult, filters: ScanFilters): boolean {
  const f = normalizeFilters(filters);

  // Price filters
  const priceOk = (f.minPrice == null || result.price >= f.minPrice) &&
                  (f.maxPrice == null || result.price <= f.maxPrice);

  // Volume filter
  const volOk = f.minVolume == null || result.volume >= f.minVolume;

  // Sector filter
  const sectorOk = !f.sectors.length || f.sectors.includes(result.sector);

  // Market cap filter
  let capOk = true;
  if (f.marketCap !== 'any') {
    const bucket = getMarketCapBucket(result.marketCap);
    capOk = bucket === f.marketCap;
  }

  return priceOk && volOk && sectorOk && capOk;
}

/**
 * Apply filters to an array of scan results
 * Returns filtered array
 */
export function applyFiltersToResults(results: ScanResult[], filters: ScanFilters): ScanResult[] {
  return results.filter(r => resultPassesFilters(r, filters));
}
