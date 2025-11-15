/**
 * Live Scan Edge Function - Multi-Provider Architecture
 * 
 * This edge function orchestrates data gathering from multiple providers:
 * - Price providers (Finnhub, Massive, IEX, etc.)
 * - News providers (Finnhub, Benzinga, etc.)
 * - Fundamentals providers (Finnhub, AlphaVantage, etc.)
 * 
 * Currently active: Finnhub across all three categories
 * 
 * Massive (formerly Polygon) can be plugged in by implementing PriceDataProvider and
 * registering it in activePriceProviders once an API key + endpoint are added.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ScanMode = 'daily-volatility' | 'catalyst-hunter' | 'cmbm-style' | 'momentum';
type MomentumGrade = 'A' | 'B' | 'C' | 'D';
type Sentiment = 'Long' | 'Short' | 'Neutral';
type RiskLevel = 'Low' | 'Medium' | 'High';
type MarketCapRange = 'micro' | 'small' | 'mid' | 'any';
type QuoteSource = 'finnhub' | 'massive' | 'iex' | 'alphavantage';

interface ScoreBreakdown {
  catalysts: number;
  momentum: number;
  structure: number;
  sentiment: number;
}

interface ScanFilters {
  marketCap: MarketCapRange;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  sectors: string[];
}

interface ScanRequest {
  mode: ScanMode;
  filters: ScanFilters;
  notes?: string;
}

interface ScanResult {
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  float: number;
  sector: string;
  scanMode: ScanMode;
  catalystSummary: string;
  momentumGrade: MomentumGrade;
  explosivePotential: number;
  scoreBreakdown: ScoreBreakdown;
  sentiment: Sentiment;
  riskLevel: RiskLevel;
  riskNotes: string;
  whyItMightMove: string;
  tags: string[];
  primaryNewsHeadline?: string;
  primaryNewsUrl?: string;
  primaryNewsDatetime?: string;
}

interface TickerMeta {
  symbol: string;
  sector: string;
  capBucket: 'micro' | 'small' | 'mid' | 'large';
}

interface RawQuote {
  source: QuoteSource;
  ticker: string;
  price: number | null;
  prevClose: number | null;
  volume: number | null;
  timestamp: number | null;
}

interface RawNewsItem {
  source: string;
  ticker: string;
  headline: string;
  summary: string;
  url: string;
  datetime: string;
  category?: string;
}

interface FundamentalSnapshot {
  ticker: string;
  marketCap: number | null;
  float: number | null;
  sector: string | null;
}

// ============================================================================
// PROVIDER INTERFACES
// ============================================================================

interface PriceDataProvider {
  name: string;
  fetchQuotes(tickers: string[], request: ScanRequest): Promise<RawQuote[]>;
}

interface NewsDataProvider {
  name: string;
  fetchNews(tickers: string[], request: ScanRequest): Promise<RawNewsItem[]>;
}

interface FundamentalsDataProvider {
  name: string;
  fetchFundamentals(tickers: string[], request: ScanRequest): Promise<FundamentalSnapshot[]>;
}

// ============================================================================
// FINNHUB PROVIDER IMPLEMENTATIONS
// ============================================================================

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

function getFinnhubApiKey(): string {
  const key = Deno.env.get('FINNHUB_API_KEY');
  if (!key) {
    throw new Error('FINNHUB_API_KEY environment variable is not set');
  }
  return key;
}

/**
 * Fetch recent daily volume from Finnhub candles endpoint
 * Tries the last 30 days and returns the most recent positive volume.
 */
async function fetchFinnhubDailyVolume(ticker: string): Promise<number | null> {
  try {
    const apiKey = getFinnhubApiKey();

    const nowSec = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = nowSec - (30 * 24 * 60 * 60);

    const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${thirtyDaysAgo}&to=${nowSec}&token=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      console.error(`Finnhub candle error for ${ticker}: ${res.status} ${txt}`);
      return null;
    }

    const data = await res.json();

    if (!data || data.s !== 'ok' || !Array.isArray(data.v) || data.v.length === 0) {
      if (data && data.s === 'no_data') {
        console.log(`[Finnhub] No candle data for ${ticker} in last 30 days.`);
      }
      return null;
    }

    // Find the most recent positive volume value
    for (let i = data.v.length - 1; i >= 0; i--) {
      const vol = data.v[i];
      if (typeof vol === 'number' && vol > 0) {
        return vol;
      }
    }

    return null;
  } catch (err) {
    console.error(`fetchFinnhubDailyVolume error for ${ticker}:`, err);
    return null;
  }
}

async function fetchFinnhubQuote(ticker: string): Promise<RawQuote | null> {
  try {
    const apiKey = getFinnhubApiKey();
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Finnhub quote error for ${ticker}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    
    if (data.c == null || data.pc == null) {
      return null;
    }

    // Try to get volume from quote first
    let volume: number | null = typeof data.v === 'number' && data.v > 0 ? data.v : null;
    
    // If quote doesn't have volume, fallback to daily candle volume
    if (volume == null) {
      console.log(`[Finnhub] Quote volume missing for ${ticker} (got ${data.v}), fetching from candles...`);
      volume = await fetchFinnhubDailyVolume(ticker);
      if (volume != null) {
        console.log(`[Finnhub] Successfully retrieved volume from candles for ${ticker}: ${volume}`);
      } else {
        console.log(`[Finnhub] No volume available from candles for ${ticker}, trying Massive fallback...`);
        volume = await fetchMassiveRecentDailyVolume(ticker);
        if (volume != null) {
          console.log(`[Massive] Fallback volume for ${ticker}: ${volume}`);
        }
      }
    }

    return {
      source: 'finnhub',
      ticker,
      price: data.c,
      prevClose: data.pc,
      volume,
      timestamp: data.t ? data.t * 1000 : Date.now(),
    };
  } catch (err) {
    console.error(`fetchFinnhubQuote error for ${ticker}:`, err);
    return null;
  }
}

async function fetchFinnhubCompanyNews(ticker: string): Promise<RawNewsItem[]> {
  try {
    const apiKey = getFinnhubApiKey();

    const now = Math.floor(Date.now() / 1000);
    const threeDaysAgo = now - 3 * 24 * 60 * 60;

    const fromDate = new Date(threeDaysAgo * 1000).toISOString().slice(0, 10);
    const toDate = new Date().toISOString().slice(0, 10);

    const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(ticker)}&from=${fromDate}&to=${toDate}&token=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Finnhub company news error for ${ticker}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data.slice(0, 5).map((item: any) => {
      const ts = typeof item.datetime === 'number' ? item.datetime * 1000 : Date.now();
      return {
        source: 'finnhub-news',
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

async function fetchFinnhubFundamentals(ticker: string): Promise<FundamentalSnapshot | null> {
  try {
    const apiKey = getFinnhubApiKey();
    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Finnhub fundamentals error for ${ticker}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    
    return {
      ticker,
      marketCap: typeof data.marketCapitalization === 'number' ? data.marketCapitalization * 1_000_000 : null,
      float: typeof data.shareOutstanding === 'number' ? data.shareOutstanding * 1_000_000 : null,
      sector: typeof data.finnhubIndustry === 'string' ? data.finnhubIndustry : null,
    };
  } catch (err) {
    console.error(`fetchFinnhubFundamentals error for ${ticker}:`, err);
    return null;
  }
}

const finnhubPriceProvider: PriceDataProvider = {
  name: 'Finnhub',
  async fetchQuotes(tickers: string[], _request: ScanRequest): Promise<RawQuote[]> {
    console.log(`[FinnhubPriceProvider] Fetching quotes for ${tickers.length} tickers`);
    
    const results = await Promise.allSettled(
      tickers.map(ticker => fetchFinnhubQuote(ticker))
    );

    const quotes: RawQuote[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
      }
    }

    console.log(`[FinnhubPriceProvider] Retrieved ${quotes.length} valid quotes`);
    return quotes;
  }
};

const finnhubNewsProvider: NewsDataProvider = {
  name: 'Finnhub News',
  async fetchNews(tickers: string[], _request: ScanRequest): Promise<RawNewsItem[]> {
    console.log(`[FinnhubNewsProvider] Fetching news for ${tickers.length} tickers`);
    
    const results = await Promise.allSettled(
      tickers.map(ticker => fetchFinnhubCompanyNews(ticker))
    );

    const allNews: RawNewsItem[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allNews.push(...result.value);
      }
    }

    console.log(`[FinnhubNewsProvider] Retrieved ${allNews.length} news items`);
    return allNews;
  }
};

const finnhubFundamentalsProvider: FundamentalsDataProvider = {
  name: 'Finnhub Fundamentals',
  async fetchFundamentals(tickers: string[], _request: ScanRequest): Promise<FundamentalSnapshot[]> {
    console.log(`[FinnhubFundamentalsProvider] Fetching fundamentals for ${tickers.length} tickers`);
    
    const results = await Promise.allSettled(
      tickers.map(ticker => fetchFinnhubFundamentals(ticker))
    );

    const fundamentals: FundamentalSnapshot[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        fundamentals.push(result.value);
      }
    }

    console.log(`[FinnhubFundamentalsProvider] Retrieved ${fundamentals.length} fundamental snapshots`);
    return fundamentals;
  }
};

// ============================================================================
// BENZINGA PRO PROVIDER IMPLEMENTATIONS
// ============================================================================

const BENZINGA_BASE_URL = 'https://api.benzinga.com/api/v2/news';

function getBenzingaApiKey(): string | null {
  const key = Deno.env.get('BENZINGA_API_KEY');
  if (!key) {
    console.warn('BENZINGA_API_KEY environment variable is not set');
    return null;
  }
  return key;
}

/**
 * Fetch news from Benzinga Pro for multiple tickers
 * Uses the Benzinga Newsfeed v2 API
 */
async function fetchBenzingaNews(tickers: string[], lookbackDays = 3): Promise<RawNewsItem[]> {
  try {
    const apiKey = getBenzingaApiKey();
    if (!apiKey) {
      return [];
    }

    const now = Date.now();
    const from = new Date(now - lookbackDays * 24 * 60 * 60 * 1000);
    const fromIso = from.toISOString().slice(0, 10); // yyyy-mm-dd

    const tickerParam = tickers.join(',');
    const url = `${BENZINGA_BASE_URL}?token=${encodeURIComponent(apiKey)}&tickers=${encodeURIComponent(tickerParam)}&date=${fromIso}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Benzinga news error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn('Benzinga news returned non-array');
      return [];
    }

    const allNews: RawNewsItem[] = [];

    for (const item of data) {
      const stocks: string[] = Array.isArray(item.stocks)
        ? item.stocks.filter((s: any) => typeof s === 'string')
        : [];

      const headline = String(item.title ?? '');
      const summary = String(item.teaser ?? item.summary ?? '');
      const itemUrl = String(item.url ?? '');

      // Benzinga fields: created/updated (may be UNIX timestamp or string)
      let ts: number | null = null;
      if (typeof item.updated === 'number') {
        ts = item.updated * 1000;
      } else if (typeof item.created === 'number') {
        ts = item.created * 1000;
      } else if (typeof item.updated === 'string') {
        ts = new Date(item.updated).getTime();
      } else if (typeof item.created === 'string') {
        ts = new Date(item.created).getTime();
      }
      const datetime = ts ? new Date(ts).toISOString() : new Date().toISOString();

      const channels: string[] = Array.isArray(item.channels)
        ? item.channels.filter((c: any) => typeof c === 'string')
        : [];

      for (const ticker of stocks) {
        const t = ticker.toUpperCase();
        const newsItem: RawNewsItem = {
          source: 'benzinga-news',
          ticker: t,
          headline,
          summary,
          url: itemUrl,
          datetime,
          category: channels[0],
        };
        allNews.push(newsItem);
      }
    }

    return allNews;
  } catch (err) {
    console.error('fetchBenzingaNews error:', err);
    return [];
  }
}

const benzingaNewsProvider: NewsDataProvider = {
  name: 'Benzinga Pro',
  async fetchNews(tickers: string[], _request: ScanRequest): Promise<RawNewsItem[]> {
    console.log(`[BenzingaNewsProvider] Fetching news for ${tickers.length} tickers`);
    
    const news = await fetchBenzingaNews(tickers);
    
    console.log(`[BenzingaNewsProvider] Retrieved ${news.length} news items`);
    return news;
  }
};

// ============================================================================
// MASSIVE (FORMERLY POLYGON) PROVIDER IMPLEMENTATIONS
// ============================================================================

function getMassiveApiKey(): string | null {
  const key = Deno.env.get('MASSIVE_API_KEY');
  if (!key) {
    console.warn('MASSIVE_API_KEY environment variable is not set');
    return null;
  }
  return key;
}

function getMassiveBaseUrl(): string | null {
  const base = Deno.env.get('MASSIVE_API_BASE_URL');
  if (!base) {
    console.warn('MASSIVE_API_BASE_URL environment variable is not set');
    return null;
  }
  return base.replace(/\/$/, ''); // strip trailing slash
}

/**
 * Fetch recent daily volume from Massive (Polygon-style) aggregates
 */
async function fetchMassiveRecentDailyVolume(ticker: string): Promise<number | null> {
  try {
    const baseUrl = getMassiveBaseUrl();
    const apiKey = getMassiveApiKey();
    if (!baseUrl || !apiKey) return null;

    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = fromDate.toISOString().slice(0, 10);

    const url = `${baseUrl}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}?adjusted=true&apiKey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Massive volume error for ${ticker}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    for (let i = results.length - 1; i >= 0; i--) {
      const v = results[i]?.v;
      if (typeof v === 'number' && v > 0) return v;
    }
    return null;
  } catch (err) {
    console.error(`fetchMassiveRecentDailyVolume error for ${ticker}:`, err);
    return null;
  }
}
async function fetchMassiveQuote(ticker: string): Promise<RawQuote | null> {
  try {
    const baseUrl = getMassiveBaseUrl();
    const apiKey = getMassiveApiKey();

    if (!baseUrl || !apiKey) {
      return null;
    }

    // TODO: Update this endpoint path according to Massive's actual API structure
    // Example placeholder - adjust based on Massive docs (formerly Polygon v2/aggs/ticker/{ticker}/prev)
    const url = `${baseUrl}/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev?apiKey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Massive quote error for ${ticker}: ${res.status}`);
      return null;
    }

    const data = await res.json();

    // TODO: Map Massive's actual JSON fields into price/prevClose/volume/timestamp
    // This mapping is a placeholder based on Polygon-style response structure
    // Adjust according to actual Massive API response format
    const results = data.results?.[0];
    if (!results) {
      return null;
    }

    const price = typeof results.c === 'number' ? results.c : null; // close price
    const prevClose = typeof results.o === 'number' ? results.o : null; // open as prev close approximation
    const volume = typeof results.v === 'number' ? results.v : null;
    const timestamp = typeof results.t === 'number' ? results.t : null;

    if (price == null || prevClose == null) {
      return null;
    }

    return {
      source: 'massive',
      ticker,
      price,
      prevClose,
      volume,
      timestamp,
    };
  } catch (err) {
    console.error(`fetchMassiveQuote error for ${ticker}:`, err);
    return null;
  }
}

const massivePriceProvider: PriceDataProvider = {
  name: 'Massive',
  async fetchQuotes(tickers: string[], _request: ScanRequest): Promise<RawQuote[]> {
    console.log(`[MassivePriceProvider] Fetching quotes for ${tickers.length} tickers`);
    
    const results = await Promise.allSettled(
      tickers.map(ticker => fetchMassiveQuote(ticker))
    );

    const quotes: RawQuote[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
      } else if (result.status === 'rejected') {
        console.error('[MassivePriceProvider] Error:', result.reason);
      }
    }

    console.log(`[MassivePriceProvider] Retrieved ${quotes.length} valid quotes`);
    return quotes;
  }
};

// ============================================================================
// ACTIVE PROVIDER REGISTRATION
// ============================================================================

const activePriceProviders: PriceDataProvider[] = [
  finnhubPriceProvider,
  massivePriceProvider, // Massive (formerly Polygon) price source
];
const activeNewsProviders: NewsDataProvider[] = [
  finnhubNewsProvider,
  benzingaNewsProvider, // Benzinga Pro news source
];
const activeFundamentalsProviders: FundamentalsDataProvider[] = [finnhubFundamentalsProvider];

// TODO: Add IEXPriceProvider, AlphaVantagePriceProvider, etc.
// TODO: Add MassiveNewsProvider, etc.
// TODO: Add MassiveFundamentalsProvider, AlphaVantageFundamentalsProvider, etc.

// ============================================================================
// UNIVERSE MODULE
// ============================================================================

const TICKER_UNIVERSE: TickerMeta[] = [
  { symbol: 'AAPL', sector: 'Technology', capBucket: 'large' },
  { symbol: 'TSLA', sector: 'Consumer', capBucket: 'large' },
  { symbol: 'NVDA', sector: 'Technology', capBucket: 'large' },
  { symbol: 'AMD', sector: 'Technology', capBucket: 'large' },
  { symbol: 'SMCI', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'PLTR', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'TQQQ', sector: 'ETF', capBucket: 'mid' },
  { symbol: 'SOXL', sector: 'ETF', capBucket: 'mid' },
  { symbol: 'IWM', sector: 'ETF', capBucket: 'large' },
  { symbol: 'RIOT', sector: 'Crypto', capBucket: 'small' },
  { symbol: 'MARA', sector: 'Crypto', capBucket: 'small' },
  { symbol: 'HUDI', sector: 'Industrial', capBucket: 'micro' },
  { symbol: 'IONQ', sector: 'Technology', capBucket: 'small' },
  { symbol: 'DNA', sector: 'Biotech', capBucket: 'small' },
  { symbol: 'JOBY', sector: 'Industrial', capBucket: 'small' },
  { symbol: 'ASTS', sector: 'Communications', capBucket: 'small' },
  { symbol: 'GME', sector: 'Consumer', capBucket: 'mid' },
  { symbol: 'AMC', sector: 'Consumer', capBucket: 'mid' },
  { symbol: 'CVNA', sector: 'Consumer', capBucket: 'mid' },
  { symbol: 'FFIE', sector: 'Consumer', capBucket: 'micro' },
  { symbol: 'SOUN', sector: 'Technology', capBucket: 'small' },
  { symbol: 'AI', sector: 'Technology', capBucket: 'mid' }
];

function buildLiveUniverse(request: ScanRequest): TickerMeta[] {
  const { mode, filters } = request;
  let pool = TICKER_UNIVERSE;

  if (mode === 'cmbm-style') {
    pool = pool.filter(meta => meta.capBucket === 'micro' || meta.capBucket === 'small');
  } else if (mode === 'momentum') {
    pool = pool.filter(meta => ['Technology', 'Crypto', 'ETF'].includes(meta.sector));
  } else if (mode === 'catalyst-hunter') {
    pool = pool.filter(meta => meta.capBucket !== 'large' || meta.sector !== 'ETF');
  }

  if (filters.marketCap !== 'any') {
    pool = pool.filter(meta => meta.capBucket === filters.marketCap);
  }

  if (filters.sectors && filters.sectors.length > 0) {
    pool = pool.filter(meta => filters.sectors.includes(meta.sector));
  }

  return pool.slice(0, 40);
}

// ============================================================================
// DATA AGGREGATION HELPERS
// ============================================================================

function mergeRawQuotes(quotes: RawQuote[]): RawQuote | null {
  if (!quotes || quotes.length === 0) return null;

  const valid = quotes.filter(q => q && q.price != null && q.prevClose != null);
  if (!valid.length) return quotes[0] ?? null;

  const sorted = [...valid].sort((a, b) => {
    const ta = a.timestamp ?? 0;
    const tb = b.timestamp ?? 0;
    return tb - ta;
  });

  const primary = sorted[0];
  let volume = primary.volume;
  if (volume == null) {
    for (const q of sorted) {
      if (q.volume != null) {
        volume = q.volume;
        break;
      }
    }
  }

  return { ...primary, volume };
}

function mergeFundamentals(snapshots: FundamentalSnapshot[]): FundamentalSnapshot | null {
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

// ============================================================================
// SCORING LOGIC
// ============================================================================

function deriveScoreBreakdown(changePercent: number, volume: number | null, mode: ScanMode): ScoreBreakdown {
  const absChange = Math.abs(changePercent);
  const volFactor = volume && volume > 1_000_000 ? 1 : 0.7;

  let momentum = Math.min(100, absChange * 5 * volFactor);
  let structure = Math.max(30, Math.min(95, momentum + (mode === 'momentum' ? 5 : 0)));
  let catalysts = Math.max(10, Math.min(90, momentum - 5));

  if (mode === 'catalyst-hunter') {
    catalysts = Math.min(100, catalysts + 15);
  } else if (mode === 'cmbm-style') {
    structure = Math.min(100, structure + 10);
  }

  const sentimentScore = changePercent >= 0 ? 60 + absChange : 40 - absChange;

  return {
    catalysts: Math.round(catalysts),
    momentum: Math.round(momentum),
    structure: Math.round(structure),
    sentiment: Math.max(0, Math.min(100, Math.round(sentimentScore)))
  };
}

function deriveLabels(changePercent: number, mode: ScanMode): { momentumGrade: MomentumGrade; sentiment: Sentiment; riskLevel: RiskLevel } {
  const absChange = Math.abs(changePercent);
  let momentumGrade: MomentumGrade = 'D';
  if (absChange > 15) momentumGrade = 'A';
  else if (absChange > 8) momentumGrade = 'B';
  else if (absChange > 3) momentumGrade = 'C';

  const sentiment: Sentiment = changePercent >= 0 ? 'Long' : 'Short';

  let riskLevel: RiskLevel = 'Low';
  if (absChange > 12) riskLevel = 'High';
  else if (absChange > 5) riskLevel = 'Medium';

  if (mode === 'cmbm-style' && riskLevel !== 'High') {
    riskLevel = 'Medium';
  }

  return { momentumGrade, sentiment, riskLevel };
}

function deriveExplosivePotential(score: ScoreBreakdown, mode: ScanMode): number {
  const base = (score.momentum * 0.4) + (score.structure * 0.3) + (score.catalysts * 0.2) + (score.sentiment * 0.1);
  let adjusted = base;
  if (mode === 'cmbm-style') adjusted += 10;
  return Math.max(0, Math.min(100, Math.round(adjusted)));
}

function deriveTags(
  changePercent: number,
  volume: number | null,
  metaSector: string,
  capBucket: 'micro' | 'small' | 'mid' | 'large',
  mode: ScanMode
): string[] {
  const tags: string[] = [];
  const absChange = Math.abs(changePercent);

  if (capBucket === 'micro' || capBucket === 'small') tags.push('Microcap');
  if (metaSector === 'Crypto') tags.push('Crypto-linked');
  if (metaSector === 'Technology') tags.push('Tech');
  if (absChange > 10) tags.push('High Volatility');
  if (absChange > 20) tags.push('Parabolic Risk');
  if (volume && volume > 5_000_000) tags.push('High Volume');

  if (mode === 'cmbm-style') tags.push('CMBM-Style Candidate');
  if (mode === 'momentum') tags.push('Momentum Scan');
  if (mode === 'catalyst-hunter') tags.push('Catalyst Focus');

  return Array.from(new Set(tags));
}

// ============================================================================
// NEWS/CATALYST PROCESSING
// ============================================================================

function buildCatalystFromNews(news: RawNewsItem[]): {
  catalystSummary: string;
  primary?: RawNewsItem;
  catalystTags: string[];
} {
  if (!news.length) {
    return {
      catalystSummary: 'No recent company-specific news detected in the last few days.',
      primary: undefined,
      catalystTags: []
    };
  }

  // Sort by datetime descending to get the most recent news first
  const sorted = [...news].sort((a, b) => b.datetime.localeCompare(a.datetime));
  const primary = sorted[0];
  const tags: string[] = [];

  const headline = primary.headline.toLowerCase();
  if (headline.includes('earnings') || headline.includes('q1') || headline.includes('q2') || headline.includes('q3') || headline.includes('q4')) {
    tags.push('Earnings');
  }
  if (headline.includes('guidance')) tags.push('Guidance');
  if (headline.includes('upgrade') || headline.includes('downgrade')) tags.push('Analyst Action');
  if (headline.includes('merger') || headline.includes('acquisition')) tags.push('M&A');
  if (headline.includes('contract') || headline.includes('deal')) tags.push('Contract');
  if (headline.includes('FDA') || headline.includes('trial') || headline.includes('phase')) tags.push('Biotech Catalyst');

  const catalystSummary = `Latest news: ${primary.headline} (${new Date(primary.datetime).toLocaleString()}).`;

  return { catalystSummary, primary, catalystTags: Array.from(new Set(tags)) };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request } = await req.json() as { request: ScanRequest };

    console.log(`[LiveScan] Starting scan with mode: ${request.mode}`);

    // 1. Build ticker universe
    const metaUniverse = buildLiveUniverse(request);
    const tickers = metaUniverse.map(m => m.symbol);
    console.log(`[LiveScan] Universe size: ${tickers.length} tickers`);

    // 2. Fetch quotes from all active price providers
    const allQuotesArrays = await Promise.all(
      activePriceProviders.map(provider => provider.fetchQuotes(tickers, request))
    );
    const allQuotes = allQuotesArrays.flat();

    // Group quotes by ticker and merge
    const quotesByTicker = new Map<string, RawQuote[]>();
    for (const quote of allQuotes) {
      if (!quotesByTicker.has(quote.ticker)) {
        quotesByTicker.set(quote.ticker, []);
      }
      quotesByTicker.get(quote.ticker)!.push(quote);
    }

    const mergedQuotes = new Map<string, RawQuote>();
    for (const [ticker, quotes] of quotesByTicker.entries()) {
      const merged = mergeRawQuotes(quotes);
      if (merged) {
        mergedQuotes.set(ticker, merged);
      }
    }

    console.log(`[LiveScan] Merged quotes for ${mergedQuotes.size} tickers`);

    // 3. Fetch fundamentals from all active providers
    const allFundamentalsArrays = await Promise.all(
      activeFundamentalsProviders.map(provider => provider.fetchFundamentals(tickers, request))
    );
    const allFundamentals = allFundamentalsArrays.flat();

    // Group and merge fundamentals
    const fundamentalsByTicker = new Map<string, FundamentalSnapshot[]>();
    for (const fund of allFundamentals) {
      if (!fundamentalsByTicker.has(fund.ticker)) {
        fundamentalsByTicker.set(fund.ticker, []);
      }
      fundamentalsByTicker.get(fund.ticker)!.push(fund);
    }

    const mergedFundamentals = new Map<string, FundamentalSnapshot>();
    for (const [ticker, funds] of fundamentalsByTicker.entries()) {
      const merged = mergeFundamentals(funds);
      if (merged) {
        mergedFundamentals.set(ticker, merged);
      }
    }

    console.log(`[LiveScan] Merged fundamentals for ${mergedFundamentals.size} tickers`);

    // 4. Identify top movers for news lookup
    const quotesWithChange: Array<{ ticker: string; absChange: number }> = [];
    for (const [ticker, quote] of mergedQuotes.entries()) {
      if (quote.price != null && quote.prevClose != null && quote.prevClose !== 0) {
        const changePercent = ((quote.price - quote.prevClose) / quote.prevClose) * 100;
        quotesWithChange.push({ ticker, absChange: Math.abs(changePercent) });
      }
    }

    quotesWithChange.sort((a, b) => b.absChange - a.absChange);
    const topMoverTickers = quotesWithChange.slice(0, 10).map(x => x.ticker);

    // 5. Fetch news for top movers from all active news providers
    const allNewsArrays = await Promise.all(
      activeNewsProviders.map(provider => provider.fetchNews(topMoverTickers, request))
    );
    const allNews = allNewsArrays.flat();

    // Group news by ticker
    const newsByTicker = new Map<string, RawNewsItem[]>();
    for (const newsItem of allNews) {
      if (!newsByTicker.has(newsItem.ticker)) {
        newsByTicker.set(newsItem.ticker, []);
      }
      newsByTicker.get(newsItem.ticker)!.push(newsItem);
    }

    // Sort news by datetime (most recent first) for each ticker
    for (const [ticker, items] of newsByTicker.entries()) {
      items.sort((a, b) => b.datetime.localeCompare(a.datetime));
      newsByTicker.set(ticker, items);
    }

    console.log(`[LiveScan] Fetched news for ${newsByTicker.size} tickers`);

    // 6. Build ScanResult array
    const results: ScanResult[] = [];

    for (const meta of metaUniverse) {
      const quote = mergedQuotes.get(meta.symbol);
      if (!quote || quote.price == null || quote.prevClose == null || quote.prevClose === 0) {
        continue;
      }

      const changePercent = ((quote.price - quote.prevClose) / quote.prevClose) * 100;
      const fundamentals = mergedFundamentals.get(meta.symbol);
      const news = newsByTicker.get(meta.symbol) || [];

      const scoreBreakdown = deriveScoreBreakdown(changePercent, quote.volume, request.mode);
      const { momentumGrade, sentiment, riskLevel } = deriveLabels(changePercent, request.mode);
      const explosivePotential = deriveExplosivePotential(scoreBreakdown, request.mode);
      const baseTags = deriveTags(changePercent, quote.volume, meta.sector, meta.capBucket, request.mode);

      const { catalystSummary, primary, catalystTags } = buildCatalystFromNews(news);
      const finalTags = Array.from(new Set([...baseTags, ...catalystTags]));

      const marketCap = fundamentals?.marketCap ?? 1_000_000_000;
      const float = fundamentals?.float ?? marketCap / 100;
      const sector = fundamentals?.sector ?? meta.sector;

      const result: ScanResult = {
        ticker: meta.symbol,
        companyName: meta.symbol,
        price: quote.price,
        changePercent,
        volume: quote.volume ?? 0,
        marketCap,
        float,
        sector,
        scanMode: request.mode,
        catalystSummary,
        momentumGrade,
        explosivePotential,
        scoreBreakdown,
        sentiment,
        riskLevel,
        riskNotes: riskLevel === 'High' ? 'Extreme volatility detected' : 'Monitor closely',
        whyItMightMove: `${changePercent >= 0 ? 'Upward' : 'Downward'} momentum with ${Math.abs(changePercent).toFixed(1)}% move`,
        tags: finalTags,
        primaryNewsHeadline: primary?.headline,
        primaryNewsUrl: primary?.url,
        primaryNewsDatetime: primary?.datetime,
      };

      // Log volume for debugging
      if (quote.volume == null) {
        console.log(`[LiveScan] WARNING: No volume data for ${meta.symbol}, defaulting to 0`);
      }

      results.push(result);
    }

    // Apply comprehensive filters
    let filtered = results;

    // Helper function to get market cap bucket
    function getMarketCapBucket(marketCap: number): 'micro' | 'small' | 'mid' | 'large' {
      if (marketCap < 300_000_000) return 'micro';
      if (marketCap < 2_000_000_000) return 'small';
      if (marketCap < 10_000_000_000) return 'mid';
      return 'large';
    }

    // Apply market cap filter
    if (request.filters.marketCap !== 'any') {
      filtered = filtered.filter(r => {
        const bucket = getMarketCapBucket(r.marketCap);
        return bucket === request.filters.marketCap;
      });
    }

    // Apply price filters
    if (request.filters.minPrice != null) {
      filtered = filtered.filter(r => r.price >= request.filters.minPrice!);
    }

    if (request.filters.maxPrice != null) {
      filtered = filtered.filter(r => r.price <= request.filters.maxPrice!);
    }

    // Apply volume filter
    if (request.filters.minVolume != null) {
      filtered = filtered.filter(r => r.volume >= request.filters.minVolume!);
    }

    // Apply sector filter
    if (request.filters.sectors && request.filters.sectors.length > 0) {
      filtered = filtered.filter(r => request.filters.sectors.includes(r.sector));
    }

    // Sort by explosivePotential
    filtered.sort((a, b) => b.explosivePotential - a.explosivePotential);

    console.log(`[LiveScan] Returning ${filtered.length} results after filtering from ${results.length} total`);

    return new Response(JSON.stringify(filtered), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[LiveScan] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
