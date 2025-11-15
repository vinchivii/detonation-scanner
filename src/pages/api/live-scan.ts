/**
 * Live Market Scan API Handler
 * 
 * Multi-source market data aggregation endpoint.
 * Calls multiple market data APIs (starting with Finnhub), merges quotes,
 * and returns ScanResult[] matching the app's expected format.
 * 
 * API keys are kept server-side and never exposed to the browser.
 * 
 * Note: This is a handler module designed to work with various backend frameworks.
 * In production, this should be deployed as a serverless function or API endpoint.
 */

import { ScanRequest, ScanResult, ScanMode, MomentumGrade, Sentiment, RiskLevel, ScoreBreakdown } from '../../lib/types';
import { RawQuote } from '../../lib/quoteTypes';
import { mergeRawQuotes } from '../../lib/quoteMerge';
import { fetchFinnhubQuote } from '../../lib/finnhubClient';

/**
 * Get the universe of tickers to scan based on the request
 * 
 * TODO: Expand this to:
 * - Filter by request.filters.marketCap (micro, small, mid, any)
 * - Filter by request.filters.sectors
 * - Use different universes for different scan modes
 * - Pull from a database or external screener API
 */
function getLiveUniverseForRequest(request: ScanRequest): string[] {
  // Base universe covering popular momentum, tech, and volatile names
  const base: string[] = [
    // Mega cap tech
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
    // Momentum / volatile
    'PLTR', 'SMCI', 'ARM', 'AVGO',
    // Indexes / leveraged
    'SPY', 'QQQ', 'IWM', 'TQQQ', 'SOXL',
    // High volatility / momentum stocks
    'RIOT', 'MARA', 'PLUG', 'IONQ', 'JOBY', 'ASTS', 'DNA',
    // Meme / retail favorites
    'CVNA', 'GME', 'AMC',
  ];

  // TODO: Branch logic based on request.mode and filters
  // For example:
  // - 'cmbm-style': filter to low float microcaps
  // - 'catalyst-hunter': include biotech, pending FDA catalysts
  // - 'momentum': top gainers from previous day
  // - request.filters.sectors: filter by sector

  return base;
}

/**
 * Derive ScoreBreakdown from price change and volume
 * 
 * Simple heuristic scoring:
 * - Momentum driven by absolute price change
 * - Catalysts slightly lower than momentum
 * - Structure follows momentum
 * - Sentiment based on direction of change
 */
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

/**
 * Derive momentum grade, sentiment, and risk level from price change
 */
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

/**
 * Generate basic tags based on scan mode and price movement
 */
function generateTags(mode: ScanMode, changePercent: number, riskLevel: RiskLevel): string[] {
  const tags: string[] = [];

  if (mode === 'catalyst-hunter') tags.push('Catalyst', 'Event Driven');
  else if (mode === 'momentum') tags.push('Momentum', 'Breakout');
  else if (mode === 'cmbm-style') tags.push('Low Float', 'Squeeze');
  else tags.push('Volatility', 'Day Trade');

  if (Math.abs(changePercent) > 10) tags.push('High Volatility');
  if (changePercent > 5) tags.push('Strong Uptrend');
  if (changePercent < -5) tags.push('Downtrend');
  if (riskLevel === 'High') tags.push('High Risk');

  return tags;
}

/**
 * Main handler for live scan requests
 * Export this function to use with your backend framework of choice
 */
export async function handleLiveScan(request: ScanRequest): Promise<ScanResult[]> {
  if (!request || !request.mode) {
    throw new Error('Invalid request: missing mode');
  }

  // Check for API key
  if (!process.env.FINNHUB_API_KEY) {
    console.error('FINNHUB_API_KEY is not set - cannot run live scan');
    throw new Error('Live data provider not configured. Set FINNHUB_API_KEY in environment variables.');
  }

  // Get universe of tickers to scan
  const tickers = getLiveUniverseForRequest(request);

  // Fetch quotes from all sources for all tickers
  // TODO: Add more sources here as they are integrated:
  // const polygonQuotes = await Promise.all(tickers.map(fetchPolygonQuote));
  // const iexQuotes = await Promise.all(tickers.map(fetchIexQuote));
  
  const finnhubQuotes = await Promise.all(
    tickers.map(ticker => fetchFinnhubQuote(ticker))
  );

  // Build scan results
  const results: ScanResult[] = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    
    // Gather all quotes for this ticker from different sources
    const rawQuotes: RawQuote[] = [];
    
    if (finnhubQuotes[i]) rawQuotes.push(finnhubQuotes[i]!);
    // TODO: Add quotes from other sources
    // if (polygonQuotes[i]) rawQuotes.push(polygonQuotes[i]);
    // if (iexQuotes[i]) rawQuotes.push(iexQuotes[i]);

    // Merge quotes from multiple sources
    const merged = mergeRawQuotes(rawQuotes);
    
    if (!merged || merged.price == null || merged.prevClose == null) {
      continue; // Skip tickers with no valid data
    }

    // Calculate metrics
    const price = merged.price;
    const prevClose = merged.prevClose;
    const changePercent = prevClose !== 0 
      ? ((price - prevClose) / prevClose) * 100 
      : 0;
    const volume = merged.volume ?? 0;

    // Derive scores and labels
    const scoreBreakdown = deriveScoreBreakdown(changePercent, volume);
    const explosivePotential = Math.round(
      scoreBreakdown.catalysts * 0.3 +
      scoreBreakdown.momentum * 0.25 +
      scoreBreakdown.structure * 0.25 +
      scoreBreakdown.sentiment * 0.2
    );
    const { momentumGrade, sentiment, riskLevel } = deriveLabels(changePercent);
    const tags = generateTags(request.mode, changePercent, riskLevel);

    // Build ScanResult
    // TODO: Fetch company profile data (name, sector, marketCap, float) from Finnhub or other source
    const result: ScanResult = {
      ticker,
      companyName: ticker, // TODO: fetch real company name
      price: parseFloat(price.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.round(volume),
      marketCap: 0, // TODO: fetch real market cap
      float: 0, // TODO: fetch real float
      sector: 'Unknown', // TODO: fetch real sector
      scanMode: request.mode,
      catalystSummary: `${ticker} showing ${Math.abs(changePercent).toFixed(1)}% ${changePercent >= 0 ? 'gain' : 'loss'} on ${volume > 1_000_000 ? 'strong' : 'moderate'} volume`,
      momentumGrade,
      explosivePotential,
      scoreBreakdown,
      sentiment,
      riskLevel,
      riskNotes:
        riskLevel === 'High'
          ? 'High volatility detected - use strict position sizing'
          : riskLevel === 'Medium'
          ? 'Moderate risk - standard risk management applies'
          : 'Lower volatility - suitable for larger positions',
      whyItMightMove: `Real-time ${explosivePotential}% explosive potential with ${momentumGrade} momentum grade`,
      tags,
    };

    results.push(result);
  }

  // Apply filters
  let filtered = results;
  if (request.filters.minPrice) {
    filtered = filtered.filter(r => r.price >= request.filters.minPrice!);
  }
  if (request.filters.maxPrice) {
    filtered = filtered.filter(r => r.price <= request.filters.maxPrice!);
  }
  if (request.filters.minVolume) {
    filtered = filtered.filter(r => r.volume >= request.filters.minVolume!);
  }
  // TODO: Filter by sectors when sector data is available

  // Sort by explosive potential
  filtered.sort((a, b) => b.explosivePotential - a.explosivePotential);

  console.log(`Live scan completed: ${filtered.length} results from ${tickers.length} tickers`);

  return filtered;
}
