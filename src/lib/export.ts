import { ScanResult } from './types';

/**
 * Export Utilities
 * 
 * Provides functions for exporting scan data to various formats.
 */

/**
 * Export scan results to CSV format
 * 
 * Converts an array of ScanResult objects into a CSV string suitable
 * for download and import into spreadsheet applications.
 * 
 * @param results - Array of scan results to export
 * @returns CSV-formatted string
 * 
 * @example
 * ```ts
 * const csv = exportScanResultsToCsv(results);
 * downloadCsv(csv, 'scan-results.csv');
 * ```
 */
export function exportScanResultsToCsv(results: ScanResult[]): string {
  const headers = [
    'Ticker',
    'Company',
    'Sector',
    'Price',
    'ChangePercent',
    'Volume',
    'MarketCap',
    'Float',
    'ExplosivePotential',
    'MomentumGrade',
    'Sentiment',
    'RiskLevel',
    'CatalystScore',
    'MomentumScore',
    'StructureScore',
    'SentimentScore',
  ];

  const rows = results.map(r => [
    r.ticker,
    `"${r.companyName}"`, // Quote to handle commas in company names
    r.sector,
    r.price.toFixed(2),
    r.changePercent.toFixed(2),
    r.volume,
    r.marketCap,
    r.float,
    r.explosivePotential,
    r.momentumGrade,
    r.sentiment,
    r.riskLevel,
    r.scoreBreakdown.catalysts,
    r.scoreBreakdown.momentum,
    r.scoreBreakdown.structure,
    r.scoreBreakdown.sentiment,
  ]);

  const csvLines = [headers.join(','), ...rows.map(row => row.join(','))];

  return csvLines.join('\n');
}

/**
 * Trigger a browser download of CSV data
 * 
 * Creates a Blob from the CSV string and triggers a download
 * via a temporary anchor element.
 * 
 * @param csvContent - CSV-formatted string
 * @param filename - Desired filename for the download
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a timestamped filename for exports
 * 
 * @param prefix - Filename prefix (e.g., 'scan-results')
 * @param extension - File extension (e.g., 'csv')
 * @returns Filename with timestamp
 */
export function generateTimestampedFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, '-')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
  return `${prefix}-${timestamp}.${extension}`;
}
