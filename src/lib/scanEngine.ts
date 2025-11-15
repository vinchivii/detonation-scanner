import { ScanRequest, ScanResult, ScanMode, MomentumGrade, Sentiment, RiskLevel, ScoreBreakdown } from './types';

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
  { ticker: 'FCEL', name: 'FuelCell Energy', sector: 'Energy' },
  { ticker: 'PLUG', name: 'Plug Power Inc', sector: 'Energy' },
];

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);
const randomPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function generateScoreBreakdown(mode: ScanMode): ScoreBreakdown {
  switch (mode) {
    case 'catalyst-hunter': return { catalysts: randomInRange(70, 95), momentum: randomInRange(40, 70), structure: randomInRange(50, 75), sentiment: randomInRange(55, 80) };
    case 'momentum': return { catalysts: randomInRange(30, 60), momentum: randomInRange(75, 95), structure: randomInRange(65, 85), sentiment: randomInRange(60, 80) };
    case 'cmbm-style': return { catalysts: randomInRange(60, 85), momentum: randomInRange(70, 90), structure: randomInRange(80, 98), sentiment: randomInRange(65, 90) };
    default: return { catalysts: randomInRange(40, 70), momentum: randomInRange(50, 80), structure: randomInRange(45, 75), sentiment: randomInRange(40, 70) };
  }
}

function generateMockResult(mode: ScanMode, company: typeof MOCK_COMPANIES[0]): ScanResult {
  const scoreBreakdown = generateScoreBreakdown(mode);
  const explosivePotential = Math.round(scoreBreakdown.catalysts * 0.3 + scoreBreakdown.momentum * 0.25 + scoreBreakdown.structure * 0.25 + scoreBreakdown.sentiment * 0.2);
  
  const riskLevel: RiskLevel = mode === 'cmbm-style' || explosivePotential > 80 ? (Math.random() > 0.3 ? 'High' : 'Medium') : explosivePotential < 50 ? 'Low' : 'Medium';
  
  const basePrice = mode === 'cmbm-style' ? randomInRange(2, 25) : randomInRange(10, 180);
  const changePercent = mode === 'momentum' ? randomInRange(2, 18) : randomInRange(-12, 22);
  const volume = randomInRange(1000000, 15000000);
  const float = mode === 'cmbm-style' ? randomInRange(5000000, 20000000) : randomInRange(20000000, 150000000);
  const momentumGrade = randomPick(['A', 'B', 'C']) as MomentumGrade;
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
    scanMode: mode,
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
    riskNotes: riskLevel === 'High' ? 'High volatility, position sizing critical' : riskLevel === 'Medium' ? 'Moderate risk, standard management applies' : 'Lower risk, suitable for larger positions',
    whyItMightMove: `Strong ${mode} setup with ${explosivePotential} explosive potential score`,
    tags: mode === 'catalyst-hunter' ? ['Catalyst', 'Event Driven'] : mode === 'momentum' ? ['Momentum', 'Breakout'] : mode === 'cmbm-style' ? ['Low Float', 'Squeeze'] : ['Volatility', 'Day Trade'],
  };
}

export async function runScan(request: ScanRequest): Promise<ScanResult[]> {
  await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
  
  const shuffled = [...MOCK_COMPANIES].sort(() => Math.random() - 0.5);
  const filtered = request.filters.sectors.length > 0 ? shuffled.filter(c => request.filters.sectors.includes(c.sector)) : shuffled;
  const companies = filtered.length < 8 ? shuffled.slice(0, 12) : filtered.slice(0, 12);
  
  let results = companies.map(c => generateMockResult(request.mode, c));
  
  if (request.filters.minPrice) results = results.filter(r => r.price >= request.filters.minPrice!);
  if (request.filters.maxPrice) results = results.filter(r => r.price <= request.filters.maxPrice!);
  if (request.filters.minVolume) results = results.filter(r => r.volume >= request.filters.minVolume!);
  
  return results.sort((a, b) => b.explosivePotential - a.explosivePotential);
}
