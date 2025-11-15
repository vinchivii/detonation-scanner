import { ScanRequest, ScanResult, ScanMode, MomentumGrade, Sentiment, RiskLevel, ScoreBreakdown } from './types';
import { DataMode, appConfig } from './config';

/**
 * Market Data Provider Interface
 * 
 * Abstracts the data source for stock scans, allowing us to switch
 * between mock data and live market APIs without changing UI code.
 */
export interface MarketDataProvider {
  runScan(request: ScanRequest): Promise<ScanResult[]>;
}

/**
 * Mock Market Data Provider
 * 
 * Generates realistic fake data for development and testing.
 * This implementation contains all the mock logic previously in scanEngine.ts.
 */
class MockMarketDataProvider implements MarketDataProvider {
  private readonly MOCK_COMPANIES = [
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
    { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Technology' },
    { ticker: 'MRNA', name: 'Moderna Inc', sector: 'Biotech' },
    { ticker: 'SOUN', name: 'SoundHound AI Inc', sector: 'Technology' },
    { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'Technology' },
    { ticker: 'IONQ', name: 'IonQ Inc', sector: 'Technology' },
    { ticker: 'RGTI', name: 'Rigetti Computing', sector: 'Technology' },
    { ticker: 'LLY', name: 'Eli Lilly and Company', sector: 'Healthcare' },
    { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'Technology' },
    { ticker: 'SMCI', name: 'Super Micro Computer', sector: 'Technology' },
    { ticker: 'ARM', name: 'Arm Holdings', sector: 'Technology' },
    { ticker: 'RXRX', name: 'Recursion Pharmaceuticals', sector: 'Biotech' },
    { ticker: 'SAVA', name: 'Cassava Sciences', sector: 'Biotech' },
    { ticker: 'CRSP', name: 'CRISPR Therapeutics', sector: 'Biotech' },
    { ticker: 'CVNA', name: 'Carvana Co', sector: 'Retail' },
    { ticker: 'FCEL', name: 'FuelCell Energy', sector: 'Energy' },
    { ticker: 'PLUG', name: 'Plug Power Inc', sector: 'Energy' },
  ];

  private randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private generateScoreBreakdown(): ScoreBreakdown {
    return {
      catalysts: this.randomInRange(40, 85),
      momentum: this.randomInRange(50, 90),
      structure: this.randomInRange(45, 85),
      sentiment: this.randomInRange(40, 80),
    };
  }

  private generateMockResult(company: typeof this.MOCK_COMPANIES[0]): ScanResult {
    const scoreBreakdown = this.generateScoreBreakdown();
    const explosivePotential = Math.round(
      scoreBreakdown.catalysts * 0.3 +
      scoreBreakdown.momentum * 0.25 +
      scoreBreakdown.structure * 0.25 +
      scoreBreakdown.sentiment * 0.2
    );

    const riskLevel: RiskLevel =
      explosivePotential > 80
        ? Math.random() > 0.3 ? 'High' : 'Medium'
        : explosivePotential < 50 ? 'Low' : 'Medium';

    const basePrice = this.randomInRange(10, 180);
    const changePercent = this.randomInRange(-12, 22);
    const volume = this.randomInRange(1000000, 15000000);
    const float = this.randomInRange(20000000, 150000000);
    const momentumGrade = this.randomPick(['A', 'B', 'C']) as MomentumGrade;
    const sentiment: Sentiment = changePercent > 0 ? 'Long' : Math.random() > 0.7 ? 'Neutral' : 'Short';

    return {
      ticker: company.ticker,
      companyName: company.name,
      price: parseFloat(basePrice.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.round(volume),
      marketCap: Math.round(basePrice * float),
      float: Math.round(float),
      sector: company.sector,
      scanMode: 'unified',
      catalystSummary: `${company.ticker} showing strong setup with upcoming catalyst events and momentum buildup`,
      momentumGrade,
      explosivePotential,
      scoreBreakdown: {
        catalysts: Math.round(scoreBreakdown.catalysts),
        momentum: Math.round(scoreBreakdown.momentum),
        structure: Math.round(scoreBreakdown.structure),
        sentiment: Math.round(scoreBreakdown.sentiment),
      },
      sentiment,
      riskLevel,
      riskNotes:
        riskLevel === 'High'
          ? 'High volatility, position sizing critical'
          : riskLevel === 'Medium'
          ? 'Moderate risk, standard management applies'
          : 'Lower risk, suitable for larger positions',
      whyItMightMove: `Strong setup with ${explosivePotential} explosive potential score`,
      tags: ['Volatility', 'Day Trade'],
    };
  }

  async runScan(request: ScanRequest): Promise<ScanResult[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

    const shuffled = [...this.MOCK_COMPANIES].sort(() => Math.random() - 0.5);
    const filtered =
      request.filters.sectors.length > 0
        ? shuffled.filter(c => request.filters.sectors.includes(c.sector))
        : shuffled;
    const companies = filtered.length < 8 ? shuffled.slice(0, 12) : filtered.slice(0, 12);

    let results = companies.map(c => this.generateMockResult(c));

    // Apply all filters using shared filter utilities
    const { applyFiltersToResults } = await import('./filterUtils');
    results = applyFiltersToResults(results, request.filters);

    return results.sort((a, b) => b.explosivePotential - a.explosivePotential);
  }
}

/**
 * Multi-Source Live Market Data Provider
 * 
 * Aggregates data from multiple market APIs (Finnhub, Polygon, IEX, etc.)
 * by calling a Next.js API route that merges quotes server-side.
 * 
 * This keeps API keys secure on the server and provides a unified
 * interface for multiple data sources.
 */
class MultiSourceLiveMarketDataProvider implements MarketDataProvider {
  async runScan(request: ScanRequest): Promise<ScanResult[]> {
    try {
      // Import Supabase client dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('live-scan', {
        body: { request },
      });

      if (error) {
        console.error('Live scan Supabase error:', error);
        throw new Error(`Live scan failed: ${error.message}`);
      }

      // Edge function returns results array directly
      if (!data) {
        console.error('Live scan returned no data');
        throw new Error('No data returned from live scan function');
      }

      // Handle both direct array response and wrapped response
      const results = Array.isArray(data) ? data : (data as any)?.results || data;
      
      if (!Array.isArray(results)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response from live scan function - expected results array');
      }

      console.log(`Live scan returned ${results.length} results`);
      return results;
    } catch (err) {
      console.error('MultiSourceLiveMarketDataProvider.runScan error:', err);
      throw new Error(
        `Live data provider failed: ${err instanceof Error ? err.message : 'Unknown error'}. ` +
        'Check that Lovable Cloud is configured and API keys (FINNHUB_API_KEY) are set.'
      );
    }
  }
}

// Singleton instances
const mockProvider = new MockMarketDataProvider();
const liveProvider = new MultiSourceLiveMarketDataProvider();

/**
 * Get the appropriate market data provider based on data mode
 * 
 * @param mode - 'mock' or 'live'
 * @returns MarketDataProvider instance
 */
export function getMarketDataProvider(mode: DataMode = appConfig.dataMode): MarketDataProvider {
  switch (mode) {
    case 'live':
      return liveProvider;
    case 'mock':
    default:
      return mockProvider;
  }
}
