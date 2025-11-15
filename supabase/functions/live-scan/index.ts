/**
 * Live Market Scan Edge Function
 * 
 * Multi-source market data aggregation endpoint with news/catalyst integration.
 * - Fetches real-time quotes from Finnhub
 * - Pulls company news for top movers
 * - Computes mode-aware scores and catalyst summaries
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
type ScanMode = 'daily-volatility' | 'catalyst-hunter' | 'cmbm-style' | 'momentum';
type MomentumGrade = 'A' | 'B' | 'C' | 'D';
type Sentiment = 'Long' | 'Short' | 'Neutral';
type RiskLevel = 'Low' | 'Medium' | 'High';
type QuoteSource = 'finnhub' | 'polygon' | 'iex' | 'mock';
type MarketCapRange = 'micro' | 'small' | 'mid' | 'any';

interface ScoreBreakdown {
  catalysts: number;
  momentum: number;
  structure: number;
  sentiment: number;
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

interface RawQuote {
  source: QuoteSource;
  ticker: string;
  price: number | null;
  prevClose: number | null;
  volume: number | null;
  timestamp: number | null;
}

interface RawNewsItem {
  source: QuoteSource | 'finnhub-news';
  ticker: string;
  headline: string;
  summary: string;
  url: string;
  datetime: string;
  category?: string;
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
}

interface TickerMeta {
  symbol: string;
  sector: string;
  capBucket: 'micro' | 'small' | 'mid' | 'large';
}

// ===== Finnhub Client =====

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

async function fetchFinnhubQuote(ticker: string): Promise<RawQuote | null> {
  try {
    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    if (!apiKey) {
      console.error('FINNHUB_API_KEY is not set');
      return null;
    }

    const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`Finnhub quote error for ${ticker}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const price = typeof data.c === 'number' ? data.c : null;
    const prevClose = typeof data.pc === 'number' ? data.pc : null;
    const volume = typeof data.v === 'number' ? data.v : null;
    const timestamp = typeof data.t === 'number' ? data.t : null;

    if (price === 0) {
      console.warn(`Finnhub returned 0 price for ${ticker}`);
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

async function fetchFinnhubCompanyNews(ticker: string): Promise<RawNewsItem[]> {
  try {
    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    if (!apiKey) {
      console.error('FINNHUB_API_KEY is not set');
      return [];
    }

    const now = Math.floor(Date.now() / 1000);
    const threeDaysAgo = now - 3 * 24 * 60 * 60;
    const fromDate = new Date(threeDaysAgo * 1000).toISOString().slice(0, 10);
    const toDate = new Date().toISOString().slice(0, 10);

    const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(ticker)}&from=${fromDate}&to=${toDate}&token=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`Finnhub news error for ${ticker}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

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

// ===== Universe Module =====

const TICKER_UNIVERSE: TickerMeta[] = [
  { symbol: 'AAPL', sector: 'Technology', capBucket: 'large' },
  { symbol: 'MSFT', sector: 'Technology', capBucket: 'large' },
  { symbol: 'GOOGL', sector: 'Technology', capBucket: 'large' },
  { symbol: 'AMZN', sector: 'Technology', capBucket: 'large' },
  { symbol: 'META', sector: 'Technology', capBucket: 'large' },
  { symbol: 'TSLA', sector: 'Consumer', capBucket: 'large' },
  { symbol: 'NVDA', sector: 'Technology', capBucket: 'large' },
  { symbol: 'AMD', sector: 'Technology', capBucket: 'large' },
  { symbol: 'AVGO', sector: 'Technology', capBucket: 'large' },
  { symbol: 'SMCI', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'PLTR', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'ARM', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'AI', sector: 'Technology', capBucket: 'mid' },
  { symbol: 'TQQQ', sector: 'ETF', capBucket: 'mid' },
  { symbol: 'SOXL', sector: 'ETF', capBucket: 'mid' },
  { symbol: 'IWM', sector: 'ETF', capBucket: 'large' },
  { symbol: 'SPY', sector: 'ETF', capBucket: 'large' },
  { symbol: 'QQQ', sector: 'ETF', capBucket: 'large' },
  { symbol: 'RIOT', sector: 'Crypto', capBucket: 'small' },
  { symbol: 'MARA', sector: 'Crypto', capBucket: 'small' },
  { symbol: 'CLSK', sector: 'Crypto', capBucket: 'small' },
  { symbol: 'IONQ', sector: 'Technology', capBucket: 'small' },
  { symbol: 'DNA', sector: 'Biotech', capBucket: 'small' },
  { symbol: 'JOBY', sector: 'Industrial', capBucket: 'small' },
  { symbol: 'ASTS', sector: 'Communications', capBucket: 'small' },
  { symbol: 'SOUN', sector: 'Technology', capBucket: 'small' },
  { symbol: 'PLUG', sector: 'Energy', capBucket: 'small' },
  { symbol: 'GME', sector: 'Consumer', capBucket: 'mid' },
  { symbol: 'AMC', sector: 'Consumer', capBucket: 'mid' },
  { symbol: 'CVNA', sector: 'Consumer', capBucket: 'mid' },
  { symbol: 'FFIE', sector: 'Consumer', capBucket: 'micro' },
  { symbol: 'HUDI', sector: 'Industrial', capBucket: 'micro' },
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

function buildLiveUniverse(request: ScanRequest): TickerMeta[] {
  const { mode, filters } = request;
  let pool = TICKER_UNIVERSE;

  if (mode === 'cmbm-style') {
    pool = pool.filter(meta => meta.capBucket === 'micro' || meta.capBucket === 'small');
  } else if (mode === 'momentum') {
    pool = pool.filter(meta => ['Technology', 'Crypto', 'ETF'].includes(meta.sector));
  } else if (mode === 'catalyst-hunter') {
    pool = pool.filter(meta => !(meta.capBucket === 'large' && meta.sector === 'ETF'));
  }

  pool = pool.filter(meta => matchesMarketCap(filters, meta) && matchesSector(filters, meta));
  return pool.slice(0, 40);
}

// ===== Quote Merge =====

function mergeRawQuotes(quotes: RawQuote[]): RawQuote | null {
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

// ===== Scoring Logic (Mode-Aware) =====

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
    sentiment: Math.max(0, Math.min(100, Math.round(sentimentScore))),
  };
}

function deriveLabels(changePercent: number, mode: ScanMode): {
  momentumGrade: MomentumGrade;
  sentiment: Sentiment;
  riskLevel: RiskLevel;
} {
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
  if (metaSector === 'Biotech') tags.push('Biotech');
  if (absChange > 10) tags.push('High Volatility');
  if (absChange > 20) tags.push('Parabolic Risk');
  if (volume && volume > 5_000_000) tags.push('High Volume');

  if (mode === 'cmbm-style') tags.push('CMBM-Style Candidate');
  if (mode === 'momentum') tags.push('Momentum Scan');
  if (mode === 'catalyst-hunter') tags.push('Catalyst Focus');

  return Array.from(new Set(tags));
}

// ===== News/Catalyst Helpers =====

function buildCatalystFromNews(news: RawNewsItem[]): {
  catalystSummary: string;
  primary?: RawNewsItem;
  catalystTags: string[];
} {
  if (!news.length) {
    return {
      catalystSummary: 'No recent company-specific news detected in the last few days.',
      primary: undefined,
      catalystTags: [],
    };
  }

  const primary = news[0];
  const tags: string[] = [];

  const headline = primary.headline.toLowerCase();
  if (headline.includes('earnings') || headline.includes('q1') || headline.includes('q2') || headline.includes('q3') || headline.includes('q4')) {
    tags.push('Earnings');
  }
  if (headline.includes('guidance')) tags.push('Guidance');
  if (headline.includes('upgrade') || headline.includes('downgrade')) tags.push('Analyst Action');
  if (headline.includes('merger') || headline.includes('acquisition')) tags.push('M&A');
  if (headline.includes('contract') || headline.includes('deal')) tags.push('Contract');
  if (headline.includes('fda') || headline.includes('trial') || headline.includes('phase')) tags.push('Biotech Catalyst');

  const dateStr = new Date(primary.datetime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const catalystSummary = `Latest news: ${primary.headline} (${dateStr})`;

  return { catalystSummary, primary, catalystTags: Array.from(new Set(tags)) };
}

// ===== Main Handler =====

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request } = await req.json() as { request: ScanRequest };
    console.log('Live scan request:', request);

    // Build universe
    const metaUniverse = buildLiveUniverse(request);
    const tickers = metaUniverse.map(m => m.symbol);
    console.log(`Fetching quotes for ${tickers.length} tickers`);

    // Fetch quotes
    const quotePromises = tickers.map(ticker => fetchFinnhubQuote(ticker));
    const quotes = await Promise.all(quotePromises);

    // Build initial results (without news)
    const intermediateResults: Array<{
      ticker: string;
      meta: TickerMeta;
      quote: RawQuote;
      changePercent: number;
      result: ScanResult;
    }> = [];

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const meta = metaUniverse[i];
      const rawQuote = quotes[i];

      if (!rawQuote) continue;

      const merged = mergeRawQuotes([rawQuote]);
      if (!merged || merged.price == null || merged.prevClose == null) continue;

      const price = merged.price;
      const prevClose = merged.prevClose;
      const changePercent = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      const volume = merged.volume ?? 0;

      const scoreBreakdown = deriveScoreBreakdown(changePercent, volume, request.mode);
      const { momentumGrade, sentiment, riskLevel } = deriveLabels(changePercent, request.mode);
      const explosivePotential = deriveExplosivePotential(scoreBreakdown, request.mode);
      const tags = deriveTags(changePercent, volume, meta.sector, meta.capBucket, request.mode);

      const result: ScanResult = {
        ticker,
        companyName: ticker,
        price: parseFloat(price.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume,
        marketCap: 0,
        float: 0,
        sector: meta.sector,
        scanMode: request.mode,
        catalystSummary: `Price move of ${changePercent.toFixed(2)}% with volume ${volume}. No major company-specific news detected.`,
        momentumGrade,
        explosivePotential,
        scoreBreakdown,
        sentiment,
        riskLevel,
        riskNotes:
          riskLevel === 'High'
            ? 'High volatility detected, position sizing critical'
            : riskLevel === 'Medium'
            ? 'Moderate risk level, standard risk management applies'
            : 'Lower risk detected, suitable for larger positions',
        whyItMightMove: `${Math.abs(changePercent).toFixed(1)}% ${changePercent >= 0 ? 'gain' : 'loss'} with ${momentumGrade} momentum grade`,
        tags,
      };

      intermediateResults.push({ ticker, meta, quote: merged, changePercent, result });
    }

    // Fetch news for top movers (by absolute changePercent)
    const sortedByMove = [...intermediateResults].sort((a, b) => 
      Math.abs(b.changePercent) - Math.abs(a.changePercent)
    );
    const topMovers = sortedByMove.slice(0, 10);
    
    console.log(`Fetching news for top ${topMovers.length} movers`);
    const newsPromises = topMovers.map(m => fetchFinnhubCompanyNews(m.ticker));
    const newsResults = await Promise.allSettled(newsPromises);

    const newsMap = new Map<string, RawNewsItem[]>();
    topMovers.forEach((mover, idx) => {
      const newsResult = newsResults[idx];
      if (newsResult.status === 'fulfilled') {
        newsMap.set(mover.ticker, newsResult.value);
      }
    });

    // Enrich results with news data
    const finalResults: ScanResult[] = intermediateResults.map(({ ticker, result }) => {
      const news = newsMap.get(ticker);
      if (news && news.length > 0) {
        const { catalystSummary, primary, catalystTags } = buildCatalystFromNews(news);
        return {
          ...result,
          catalystSummary,
          tags: Array.from(new Set([...result.tags, ...catalystTags])),
          primaryNewsHeadline: primary?.headline,
          primaryNewsUrl: primary?.url,
          primaryNewsDatetime: primary?.datetime,
        };
      }
      return result;
    });

    // Sort by explosive potential
    finalResults.sort((a, b) => b.explosivePotential - a.explosivePotential);

    console.log(`Returning ${finalResults.length} results`);

    return new Response(
      JSON.stringify({ results: finalResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Live scan error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
