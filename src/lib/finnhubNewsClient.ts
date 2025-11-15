/**
 * Finnhub News Client (Server-Side Only)
 * 
 * Fetches company-specific news from Finnhub API for catalyst detection.
 * Used in edge functions to enrich scan results with real news data.
 */

import { QuoteSource } from './quoteTypes';

export interface RawNewsItem {
  source: QuoteSource | 'finnhub-news';
  ticker: string;
  headline: string;
  summary: string;
  url: string;
  datetime: string; // ISO string
  category?: string;
}

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
 * Fetch recent company news for a ticker from Finnhub
 * 
 * @param ticker Stock symbol (e.g. 'AAPL', 'TSLA')
 * @returns Array of RawNewsItem, empty array if fetch fails or no news
 * 
 * Looks back 3 days for company-specific news.
 * Returns up to 5 most recent articles.
 */
export async function fetchFinnhubCompanyNews(ticker: string): Promise<RawNewsItem[]> {
  try {
    const apiKey = getFinnhubApiKey();

    // Look back 3 days for company-specific news
    const now = Math.floor(Date.now() / 1000);
    const threeDaysAgo = now - 3 * 24 * 60 * 60;

    const fromDate = new Date(threeDaysAgo * 1000).toISOString().slice(0, 10);
    const toDate = new Date().toISOString().slice(0, 10);

    const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(ticker)}&from=${fromDate}&to=${toDate}&token=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Finnhub company news error for ${ticker}: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn(`Finnhub company news returned non-array for ${ticker}`);
      return [];
    }

    // Map and clean news items
    return data.slice(0, 5).map((item: any) => {
      const ts = typeof item.datetime === 'number' ? item.datetime * 1000 : Date.now();
      return {
        source: 'finnhub-news' as const,
        ticker,
        headline: String(item.headline ?? 'No headline'),
        summary: String(item.summary ?? ''),
        url: String(item.url ?? ''),
        datetime: new Date(ts).toISOString(),
        category: typeof item.category === 'string' ? item.category : undefined,
      };
    });
  } catch (err) {
    console.error(`fetchFinnhubCompanyNews error for ${ticker}:`, err);
    return [];
  }
}

// TODO: Add more Finnhub news endpoints:
// - fetchFinnhubMarketNews() for general market sentiment
// - fetchFinnhubNewsAnalysis(ticker) for sentiment analysis on news
// - fetchFinnhubPressReleases(ticker) for company press releases
