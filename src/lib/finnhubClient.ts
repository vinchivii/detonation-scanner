/**
 * Finnhub API Client (Server-Side Only)
 * 
 * Integrates with Finnhub's REST API for real-time quote data.
 * API Key is read from environment variables and never exposed to the browser.
 * 
 * Docs: https://finnhub.io/docs/api
 */

import { RawQuote } from './quoteTypes';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Get Finnhub API key from environment
 * @throws Error if FINNHUB_API_KEY is not set
 */
function getFinnhubApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error('FINNHUB_API_KEY environment variable is not set');
  }
  return key;
}

/**
 * Fetch real-time quote for a single ticker from Finnhub
 * 
 * @param ticker Stock symbol (e.g. 'AAPL', 'TSLA')
 * @returns RawQuote or null if fetch fails
 * 
 * Finnhub API Response Fields:
 * - c: Current price
 * - pc: Previous close
 * - t: Timestamp (Unix seconds)
 * - o: Open price
 * - h: High price
 * - l: Low price
 * - d: Change
 * - dp: Percent change
 * 
 * Note: Volume (v) availability depends on Finnhub subscription tier
 */
export async function fetchFinnhubQuote(ticker: string): Promise<RawQuote | null> {
  try {
    const apiKey = getFinnhubApiKey();
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    
    const res = await fetch(url, { 
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error(`Finnhub quote error for ${ticker}: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();

    // Extract fields with type safety
    const price = typeof data.c === 'number' ? data.c : null;
    const prevClose = typeof data.pc === 'number' ? data.pc : null;
    const volume = typeof data.v === 'number' ? data.v : null;
    const timestamp = typeof data.t === 'number' ? data.t : null;

    // If price is 0, likely means no data or market closed
    if (price === 0) {
      console.warn(`Finnhub returned 0 price for ${ticker} - likely no data available`);
      return null;
    }

    return {
      source: 'finnhub',
      ticker,
      price,
      prevClose,
      volume,
      timestamp,
    };
  } catch (err) {
    console.error(`fetchFinnhubQuote error for ${ticker}:`, err);
    return null;
  }
}

// TODO: Add more Finnhub endpoints:
// - fetchFinnhubCandles(ticker, resolution, from, to) for historical data
// - fetchFinnhubProfile(ticker) for company info (name, sector, marketCap, etc.)
// - fetchFinnhubNews(ticker) for catalyst detection
// - fetchFinnhubEarnings(ticker) for earnings calendar
