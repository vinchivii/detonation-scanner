/**
 * Shared Quote Types for Multi-Source Live Data
 * 
 * These types normalize data from different market APIs (Finnhub, Polygon, IEX, etc.)
 * into a common format that can be merged and scored.
 */

// TODO: Add more sources as they are integrated (massive/polygon, iex, alpaca, etc.)
export type QuoteSource = 'finnhub' | 'massive' | 'iex' | 'mock';

/**
 * Normalized quote data from any market data source
 * 
 * All sources should map their API responses into this shape
 * so that we can merge and compare quotes from multiple providers.
 */
export interface RawQuote {
  source: QuoteSource;
  ticker: string;
  price: number | null;
  prevClose: number | null;
  volume: number | null;
  timestamp: number | null; // Unix seconds or ms, depending on source
}
