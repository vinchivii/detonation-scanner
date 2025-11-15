import { RawQuote } from './quoteTypes';

/**
 * Merge multiple RawQuote values for a single ticker
 * 
 * Strategy:
 * - Prefer quotes with complete data (price + prevClose)
 * - Use the most recent timestamp
 * - Fill in missing volume from other sources if available
 * 
 * @param quotes Array of RawQuote from different sources for the same ticker
 * @returns Single merged RawQuote or null if no valid quotes
 */
export function mergeRawQuotes(quotes: RawQuote[]): RawQuote | null {
  if (!quotes || quotes.length === 0) return null;

  // Filter to quotes with at least price and prevClose
  const valid = quotes.filter(q => q && q.price != null && q.prevClose != null);
  
  // If no valid quotes, return the first quote anyway (may be partial)
  if (!valid.length) return quotes[0] ?? null;

  // Sort by timestamp (most recent first)
  const sorted = [...valid].sort((a, b) => {
    const ta = a.timestamp ?? 0;
    const tb = b.timestamp ?? 0;
    return tb - ta;
  });

  // Start with the most recent complete quote
  const primary = sorted[0];

  // Try to fill in missing volume from other sources
  let volume = primary.volume;
  if (volume == null) {
    for (const q of sorted) {
      if (q.volume != null) {
        volume = q.volume;
        break;
      }
    }
  }

  return {
    ...primary,
    volume,
  };
}
