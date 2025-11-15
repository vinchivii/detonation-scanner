export type ScanMode = 'unified';
export type MomentumGrade = 'A' | 'B' | 'C' | 'D';
export type Sentiment = 'Long' | 'Short' | 'Neutral';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type MarketCapRange = 'micro' | 'small' | 'mid' | 'large' | 'any';

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
  highVolatilityOnly?: boolean;
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
  // Optional news/catalyst fields (populated in live mode)
  primaryNewsHeadline?: string;
  primaryNewsUrl?: string;
  primaryNewsDatetime?: string; // ISO string
}

export const SECTORS = ['Technology', 'Biotech', 'Energy', 'Defense', 'Retail', 'Finance', 'Healthcare', 'Industrial', 'Materials', 'Communications'];

export const SCAN_MODE_LABELS: Record<ScanMode, string> = {
  'unified': 'Unified Scan',
};

export const SCAN_MODE_DESCRIPTIONS: Record<ScanMode, string> = {
  'unified': 'Comprehensive market scan driven by your custom filters',
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

/**
 * Scan History Entry - logs completed scans
 */
export interface ScanHistoryEntry {
  id: string;
  runAt: string;
  mode: ScanMode;
  dataMode: 'mock' | 'live';
  filtersSummary: string;
  resultCount: number;
}
