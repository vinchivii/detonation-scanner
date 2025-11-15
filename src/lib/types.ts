export type ScanMode = 'daily-volatility' | 'catalyst-hunter' | 'cmbm-style' | 'momentum';
export type MomentumGrade = 'A' | 'B' | 'C' | 'D';
export type Sentiment = 'Long' | 'Short' | 'Neutral';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type MarketCapRange = 'micro' | 'small' | 'mid' | 'any';

export interface ScoreBreakdown {
  catalysts: number;
  momentum: number;
  structure: number;
  sentiment: number;
}

export interface ScanFilters {
  marketCap: MarketCapRange;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  sectors: string[];
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
  explosivePotential: number;
  scoreBreakdown: ScoreBreakdown;
  sentiment: Sentiment;
  riskLevel: RiskLevel;
  riskNotes: string;
  whyItMightMove: string;
  tags: string[];
}

export const SECTORS = ['Technology', 'Biotech', 'Energy', 'Defense', 'Retail', 'Finance', 'Healthcare', 'Industrial', 'Materials', 'Communications'];

export const SCAN_MODE_LABELS: Record<ScanMode, string> = {
  'daily-volatility': 'Daily Volatility',
  'catalyst-hunter': 'Catalyst Hunter',
  'cmbm-style': 'CMBM-Style',
  'momentum': 'Momentum',
};

export const SCAN_MODE_DESCRIPTIONS: Record<ScanMode, string> = {
  'daily-volatility': 'Scan for stocks with high daily volatility and breakout potential',
  'catalyst-hunter': 'Find stocks with upcoming catalysts like FDA approvals, earnings, product launches',
  'cmbm-style': 'Low float, high squeeze potential stocks with parabolic setup characteristics',
  'momentum': 'Stocks showing strong technical momentum and sustained trend strength',
};

/**
 * Saved Scan Profile - stores scan configurations for quick reuse
 */
export interface SavedScanProfile {
  id: string;
  name: string;
  description?: string;
  mode: ScanMode;
  filters: ScanFilters;
  notes?: string;
  createdAt: string;
}

/**
 * Watchlist Item - stores snapshots of scan results for tracking
 */
export interface WatchlistItem {
  id: string;
  fromScanMode: ScanMode;
  addedAt: string;
  result: ScanResult;
}
