import { ScanRequest, ScanMode, ScanFilters } from './types';

/**
 * Ticker Universe Module
 * 
 * Manages the curated universe of tickers for live scans.
 * Supports mode-based and filter-based universe selection.
 */

export interface TickerMeta {
  symbol: string;
  sector: string;
  capBucket: 'micro' | 'small' | 'mid' | 'large';
}

/**
 * Curated universe of tickers tuned for volatility and detonation-style moves.
 * Focus on high-beta, story-driven names across various sectors and cap sizes.
 */
export const TICKER_UNIVERSE: TickerMeta[] = [
  // Large-cap/high beta tech
  { symbol: 'AAPL', sector: 'Technology', capBucket: 'large' },
  { symbol: 'MSFT', sector: 'Technology', capBucket: 'large' },
  { symbol: 'GOOGL', sector: 'Technology', capBucket: 'large' },
  { symbol: 'AMZN', sector: 'Technology', capBucket: 'large' },
  { symbol: 'META', sector: 'Technology', capBucket: 'large' },
  { symbol: 'TSLA', sector: 'Consumer', capBucket: 'large' },
  { symbol: 'NVDA', sector: 'Technology', capBucket: 'large' },
  { symbol: 'AMD', sector: 'Technology', capBucket: 'large' },
  { symbol: 'AVGO', sector: 'Technology', capBucket: 'large' },

  // Mid-cap tech/volatile
  { symbol: 'SMCI', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'PLTR', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'ARM', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'AI', sector: 'Technology', capBucket: 'mid' },

  // Leveraged ETFs / volatility products
  { symbol: 'TQQQ', sector: 'ETF', capBucket: 'mid' },
  { symbol: 'SOXL', sector: 'ETF', capBucket: 'mid' },
  { symbol: 'IWM', sector: 'ETF', capBucket: 'large' },
  { symbol: 'SPY', sector: 'ETF', capBucket: 'large' },
  { symbol: 'QQQ', sector: 'ETF', capBucket: 'large' },

  // Crypto miners / blockchain
  { symbol: 'RIOT', sector: 'Crypto', capBucket: 'small' },
  { symbol: 'MARA', sector: 'Crypto', capBucket: 'small' },
  { symbol: 'CLSK', sector: 'Crypto', capBucket: 'small' },

  // Small-cap tech/speculative
  { symbol: 'IONQ', sector: 'Technology', capBucket: 'small' },
  { symbol: 'DNA', sector: 'Biotech', capBucket: 'small' },
  { symbol: 'JOBY', sector: 'Industrial', capBucket: 'small' },
  { symbol: 'ASTS', sector: 'Communications', capBucket: 'small' },
  { symbol: 'SOUN', sector: 'Technology', capBucket: 'small' },
  { symbol: 'PLUG', sector: 'Energy', capBucket: 'small' },

  // Meme / high short-interest names
  { symbol: 'GME', sector: 'Consumer', capBucket: 'mid' },
  { symbol: 'AMC', sector: 'Consumer', capBucket: 'mid' },
  { symbol: 'CVNA', sector: 'Consumer', capBucket: 'mid' },

  // Micro-cap volatility plays
  { symbol: 'FFIE', sector: 'Consumer', capBucket: 'micro' },
  { symbol: 'HUDI', sector: 'Industrial', capBucket: 'micro' },
  
  // Biotech small/mid caps
  { symbol: 'MRNA', sector: 'Biotech', capBucket: 'mid' },
  { symbol: 'CRSP', sector: 'Biotech', capBucket: 'small' },
  { symbol: 'RXRX', sector: 'Biotech', capBucket: 'small' },
];

function matchesMarketCap(filters: ScanFilters, meta: TickerMeta): boolean {
  if (filters.marketCap === 'any') return true;
  return filters.marketCap === meta.capBucket;
}

function matchesSector(filters: ScanFilters, meta: TickerMeta): boolean {
  if (!filters.sectors || filters.sectors.length === 0) return true;
  return filters.sectors.includes(meta.sector);
}

/**
 * Build the live ticker universe based on filters
 * 
 * @param request - The scan request with filters
 * @returns Array of TickerMeta objects representing the universe to scan
 */
export function buildLiveUniverse(request: ScanRequest): TickerMeta[] {
  const { filters } = request;
  let pool = TICKER_UNIVERSE;

  // Apply user filters
  pool = pool.filter(meta => 
    matchesMarketCap(filters, meta) && matchesSector(filters, meta)
  );

  // Keep universe bounded to respect rate limits and scan performance
  return pool.slice(0, 40);
}
