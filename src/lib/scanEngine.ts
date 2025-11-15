import { ScanRequest, ScanResult, ScanMode, MomentumGrade, Sentiment } from './types';

/**
 * Mock Scan Engine for Detonation Scanner
 * 
 * TODO: In production, this will integrate with real-time stock data APIs:
 * - Polygon.io for real-time price data and historical charts
 * - Finnhub for news, earnings, and catalyst data
 * - Alpha Vantage for fundamental data
 * - Custom WebSocket connections for live market data
 * 
 * The scan engine will:
 * 1. Fetch real-time market data based on filters
 * 2. Apply technical analysis algorithms (RSI, MACD, volume analysis)
 * 3. Score stocks based on momentum, volatility, and catalyst proximity
 * 4. Return ranked results with live data
 */

const MOCK_COMPANIES = [
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
];

const CATALYST_TEMPLATES = [
  'FDA approval decision expected within 30 days',
  'Earnings report next week, beat expected',
  'Major partnership announcement pending',
  'New product launch scheduled',
  'Clinical trial results due imminently',
  'Analyst upgrade cycle beginning',
  'Short squeeze setup with high SI',
  'Institutional accumulation detected',
  'Breakout from consolidation pattern',
  'Volume surge with positive news flow',
];

const RISK_TEMPLATES = [
  'High volatility, position sizing critical',
  'Low float, expect rapid price swings',
  'Regulatory risk present',
  'Crowded trade, watch for reversal',
  'News-dependent, monitor closely',
  'Elevated short interest',
  'Technical resistance nearby',
  'Market cap volatility risk',
];

function generateMockResult(
  mode: ScanMode,
  company: typeof MOCK_COMPANIES[0],
  index: number
): ScanResult {
  // Customize data based on scan mode
  let explosivePotential: number;
  let momentumGrade: MomentumGrade;
  let sentiment: Sentiment;
  let volume: number;
  let float: number;
  let tags: string[];

  const basePrice = 10 + Math.random() * 190;
  const changePercent = (Math.random() * 20 - 5).toFixed(2);

  switch (mode) {
    case 'cmbm-style':
      // Low float, high explosive potential
      explosivePotential = 70 + Math.random() * 30;
      momentumGrade = ['A', 'A', 'B'][Math.floor(Math.random() * 3)] as MomentumGrade;
      sentiment = 'Long';
      volume = 1000000 + Math.random() * 5000000;
      float = 5000000 + Math.random() * 15000000; // Low float
      tags = ['Low Float', 'High SI', 'Squeeze Setup'];
      break;

    case 'momentum':
      explosivePotential = 60 + Math.random() * 25;
      momentumGrade = ['A', 'A', 'B'][Math.floor(Math.random() * 3)] as MomentumGrade;
      sentiment = parseFloat(changePercent as string) > 0 ? 'Long' : 'Short';
      volume = 2000000 + Math.random() * 10000000;
      float = 20000000 + Math.random() * 100000000;
      tags = ['Strong Momentum', 'Trend Following'];
      break;

    case 'catalyst':
      explosivePotential = 55 + Math.random() * 35;
      momentumGrade = ['A', 'B', 'B', 'C'][Math.floor(Math.random() * 4)] as MomentumGrade;
      sentiment = 'Long';
      volume = 1500000 + Math.random() * 8000000;
      float = 30000000 + Math.random() * 150000000;
      tags = ['Catalyst Play', 'Event Driven'];
      break;

    case 'daily-volatility':
    default:
      explosivePotential = 45 + Math.random() * 40;
      momentumGrade = ['B', 'B', 'C'][Math.floor(Math.random() * 3)] as MomentumGrade;
      sentiment = ['Long', 'Short', 'Neutral'][Math.floor(Math.random() * 3)] as Sentiment;
      volume = 1000000 + Math.random() * 12000000;
      float = 25000000 + Math.random() * 200000000;
      tags = ['High Volatility', 'Day Trade'];
      break;
  }

  const marketCap = basePrice * float;

  return {
    ticker: company.ticker,
    companyName: company.name,
    price: parseFloat(basePrice.toFixed(2)),
    changePercent: parseFloat(changePercent as string),
    volume,
    marketCap,
    float,
    sector: company.sector,
    scanMode: mode,
    catalystSummary: CATALYST_TEMPLATES[Math.floor(Math.random() * CATALYST_TEMPLATES.length)],
    momentumGrade,
    explosivePotential: Math.round(explosivePotential),
    sentiment,
    riskNotes: RISK_TEMPLATES[Math.floor(Math.random() * RISK_TEMPLATES.length)],
    tags,
  };
}

/**
 * Run a stock scan based on the provided request
 * 
 * @param request - The scan configuration including mode and filters
 * @returns Promise resolving to an array of scan results
 */
export async function runScan(request: ScanRequest): Promise<ScanResult[]> {
  // TODO: Replace this with real API calls
  // 1. Build query parameters from filters
  // 2. Call market data API (e.g., Polygon.io)
  // 3. Apply technical analysis
  // 4. Score and rank results
  // 5. Fetch additional catalyst/news data
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

  // Generate 8-15 mock results
  const resultCount = 8 + Math.floor(Math.random() * 8);
  const shuffled = [...MOCK_COMPANIES].sort(() => Math.random() - 0.5);
  const selectedCompanies = shuffled.slice(0, resultCount);

  // Apply basic filter logic (sector filter)
  const filteredCompanies = request.filters.sectors.length > 0
    ? selectedCompanies.filter(c => request.filters.sectors.includes(c.sector))
    : selectedCompanies;

  // Generate results
  const results = filteredCompanies.map((company, index) =>
    generateMockResult(request.mode, company, index)
  );

  // Sort by explosive potential (descending)
  return results.sort((a, b) => b.explosivePotential - a.explosivePotential);
}
