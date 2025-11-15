/**
 * Multi-Provider Architecture for Detonation Scanner
 * 
 * This module defines provider interfaces for price, news, and fundamentals data.
 * Each provider can be implemented by different data sources (Finnhub, Massive, IEX, AlphaVantage, etc.)
 * and registered in the live-scan endpoint for automatic aggregation.
 * 
 * Other future implementations (MassivePriceProvider, IEXPriceProvider, AlphaVantagePriceProvider, 
 * BenzingaNewsProvider, etc.) can plug into the same interface and be registered in /api/live-scan.
 */

import { RawQuote } from './quoteTypes';
import { ScanRequest } from './types';

/**
 * News Item from any provider
 */
export interface RawNewsItem {
  source: string; // 'finnhub-news', 'massive-news', 'benzinga', etc.
  ticker: string;
  headline: string;
  summary: string;
  url: string;
  datetime: string; // ISO string
  category?: string;
}

/**
 * Fundamental data snapshot for a ticker
 */
export interface FundamentalSnapshot {
  ticker: string;
  marketCap: number | null;
  float: number | null;
  sector: string | null;
  // Add more as needed: pe, beta, etc.
}

/**
 * Price Data Provider Interface
 * 
 * Fetches real-time or delayed price quotes for a set of tickers.
 * Implementations: FinnhubPriceProvider, MassivePriceProvider, IEXPriceProvider, etc.
 */
export interface PriceDataProvider {
  name: string;
  fetchQuotes(tickers: string[], request: ScanRequest): Promise<RawQuote[]>;
}

/**
 * News Data Provider Interface
 * 
 * Fetches recent news/catalysts for a set of tickers.
 * Implementations: FinnhubNewsProvider, MassiveNewsProvider, BenzingaNewsProvider, etc.
 */
export interface NewsDataProvider {
  name: string;
  fetchNews(tickers: string[], request: ScanRequest): Promise<RawNewsItem[]>;
}

/**
 * Fundamentals Data Provider Interface
 * 
 * Fetches fundamental data (market cap, float, sector, etc.) for a set of tickers.
 * Implementations: FinnhubFundamentalsProvider, MassiveFundamentalsProvider, AlphaVantageFundamentalsProvider, etc.
 */
export interface FundamentalsDataProvider {
  name: string;
  fetchFundamentals(tickers: string[], request: ScanRequest): Promise<FundamentalSnapshot[]>;
}

/**
 * Merge multiple FundamentalSnapshots for the same ticker
 * Strategy: prefer non-null values, use most recently fetched data
 */
export function mergeFundamentals(snapshots: FundamentalSnapshot[]): FundamentalSnapshot | null {
  if (!snapshots || snapshots.length === 0) return null;

  const base = snapshots[0];
  let merged: FundamentalSnapshot = { ...base };

  for (const snap of snapshots.slice(1)) {
    if (snap.marketCap != null && merged.marketCap == null) merged.marketCap = snap.marketCap;
    if (snap.float != null && merged.float == null) merged.float = snap.float;
    if (snap.sector != null && merged.sector == null) merged.sector = snap.sector;
  }

  return merged;
}
