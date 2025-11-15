/**
 * Live Market Scan Edge Function
 * 
 * Multi-source market data aggregation endpoint.
 * Calls Finnhub API to fetch real-time quotes, merges data,
 * and returns ScanResult[] matching the app's expected format.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types (duplicated from client for edge function context)
type ScanMode = 'catalyst-hunter' | 'momentum' | 'cmbm-style' | 'volatility-play';
type MomentumGrade = 'A' | 'B' | 'C' | 'D';
type Sentiment = 'Long' | 'Short' | 'Neutral';
type RiskLevel = 'Low' | 'Medium' | 'High';
type QuoteSource = 'finnhub' | 'polygon' | 'iex' | 'mock';

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
}

interface RawQuote {
  source: QuoteSource;
  ticker: string;
  price: number | null;
  prevClose: number | null;
  volume: number | null;
  timestamp: number | null;
}

interface ScanRequest {
  mode: ScanMode;
  filters: {
    marketCap?: string;
    sectors: string[];
    minPrice?: number;
    maxPrice?: number;
    minVolume?: number;
  };
}

// Finnhub client
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

// Quote merge helper
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

// Universe helper
function getLiveUniverseForRequest(_request: ScanRequest): string[] {
  return [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
    'PLTR', 'SMCI', 'ARM', 'AVGO',
    'SPY', 'QQQ', 'IWM', 'TQQQ', 'SOXL',
    'RIOT', 'MARA', 'PLUG', 'IONQ', 'JOBY', 'ASTS', 'DNA',
    'CVNA', 'GME', 'AMC',
  ];
}

// Score derivation
function deriveScoreBreakdown(changePercent: number, volume: number | null): ScoreBreakdown {
  const absChange = Math.abs(changePercent);
  const volFactor = volume && volume > 1_000_000 ? 1 : 0.7;

  const momentum = Math.min(100, absChange * 5 * volFactor);
  const catalysts = Math.max(20, Math.min(80, momentum - 10));
  const structure = Math.max(30, Math.min(90, momentum));
  const sentimentScore = changePercent >= 0 ? 60 + absChange : 40 - absChange;

  return {
    catalysts: Math.round(catalysts),
    momentum: Math.round(momentum),
    structure: Math.round(structure),
    sentiment: Math.max(0, Math.min(100, Math.round(sentimentScore))),
  };
}

function deriveLabels(changePercent: number): {
  momentumGrade: MomentumGrade;
  sentiment: Sentiment;
  riskLevel: RiskLevel;
} {
  const absChange = Math.abs(changePercent);

  let momentumGrade: MomentumGrade = 'D';
  if (absChange > 10) momentumGrade = 'A';
  else if (absChange > 5) momentumGrade = 'B';
  else if (absChange > 2) momentumGrade = 'C';

  const sentiment: Sentiment = changePercent >= 0 ? 'Long' : 'Short';

  let riskLevel: RiskLevel = 'Low';
  if (absChange > 8) riskLevel = 'High';
  else if (absChange > 3) riskLevel = 'Medium';

  return { momentumGrade, sentiment, riskLevel };
}

function generateTags(mode: ScanMode, changePercent: number, riskLevel: RiskLevel): string[] {
  const tags: string[] = [];

  if (mode === 'catalyst-hunter') tags.push('Catalyst', 'Event Driven');
  else if (mode === 'momentum') tags.push('Momentum', 'Breakout');
  else if (mode === 'cmbm-style') tags.push('Low Float', 'Squeeze');
  else tags.push('Volatility', 'Day Trade');

  if (changePercent > 5) tags.push('Strong Move');
  if (riskLevel === 'High') tags.push('High Risk');

  return tags;
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request } = await req.json() as { request: ScanRequest };
    
    console.log('Live scan request:', request);

    const tickers = getLiveUniverseForRequest(request);
    console.log(`Fetching quotes for ${tickers.length} tickers`);

    // Fetch quotes from Finnhub
    const quotePromises = tickers.map(ticker => fetchFinnhubQuote(ticker));
    const quotes = await Promise.all(quotePromises);

    const results: ScanResult[] = [];

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const rawQuote = quotes[i];

      if (!rawQuote) {
        console.warn(`No quote data for ${ticker}`);
        continue;
      }

      // Merge quotes (currently just one source, but ready for multi-source)
      const merged = mergeRawQuotes([rawQuote]);
      if (!merged || merged.price == null || merged.prevClose == null) {
        console.warn(`Insufficient data for ${ticker}`);
        continue;
      }

      const price = merged.price;
      const prevClose = merged.prevClose;
      const changePercent = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      const volume = merged.volume ?? 0;

      // Derive scores and labels
      const scoreBreakdown = deriveScoreBreakdown(changePercent, volume);
      const { momentumGrade, sentiment, riskLevel } = deriveLabels(changePercent);
      const explosivePotential = Math.round(
        scoreBreakdown.catalysts * 0.3 +
        scoreBreakdown.momentum * 0.25 +
        scoreBreakdown.structure * 0.25 +
        scoreBreakdown.sentiment * 0.2
      );

      const tags = generateTags(request.mode, changePercent, riskLevel);

      const result: ScanResult = {
        ticker,
        companyName: ticker, // TODO: fetch from company profile API
        price: parseFloat(price.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume,
        marketCap: 0, // TODO: fetch from company profile
        float: 0, // TODO: fetch from company profile
        sector: 'Unknown', // TODO: fetch from company profile
        scanMode: request.mode,
        catalystSummary: `${ticker} showing ${changePercent >= 0 ? 'positive' : 'negative'} momentum with ${explosivePotential} explosive potential`,
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

      results.push(result);
    }

    // Sort by explosive potential
    results.sort((a, b) => b.explosivePotential - a.explosivePotential);

    console.log(`Returning ${results.length} results`);

    return new Response(
      JSON.stringify({ results }),
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
