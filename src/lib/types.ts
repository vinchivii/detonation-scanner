/**
 * Core domain types for Detonation Scanner
 */

export type ScanMode = 'daily-volatility' | 'catalyst' | 'cmbm-style' | 'momentum';

export type MomentumGrade = 'A' | 'B' | 'C' | 'D';

export type Sentiment = 'Long' | 'Short' | 'Neutral';

export type MarketCapRange = 'micro' | 'small' | 'mid' | 'large';

export interface ScanFilters {
  marketCapRanges: MarketCapRange[];
  priceMin: number;
  priceMax: number;
  sectors: string[];
  minVolume: number;
  minFloat?: number;
  maxFloat?: number;
  specialNotes?: string;
}

export interface ScanRequest {
  mode: ScanMode;
  filters: ScanFilters;
  notes?: string;
}

export interface ScanResult {
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
  explosivePotential: number; // 0-100
  sentiment: Sentiment;
  riskNotes: string;
  tags: string[];
}

export const SECTORS = [
  'Technology',
  'Biotech',
  'Energy',
  'Defense',
  'Retail',
  'Finance',
  'Healthcare',
  'Industrial',
  'Materials',
  'Communications',
];

export const SCAN_MODE_LABELS: Record<ScanMode, string> = {
  'daily-volatility': 'Daily Volatility',
  'catalyst': 'Catalyst Hunter',
  'cmbm-style': 'CMBM-Style',
  'momentum': 'Momentum',
};

export const SCAN_MODE_DESCRIPTIONS: Record<ScanMode, string> = {
  'daily-volatility': 'Scan for stocks with high daily volatility and breakout potential',
  'catalyst': 'Find stocks with upcoming catalysts like FDA approvals, earnings, product launches',
  'cmbm-style': 'Low float, high squeeze potential stocks with strong momentum',
  'momentum': 'Stocks showing strong technical momentum and trend strength',
};
