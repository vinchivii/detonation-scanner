import { useState } from 'react';
import { ScanResult } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanResultsTableProps {
  results: ScanResult[];
  onSelectResult: (result: ScanResult) => void;
  isLoading: boolean;
}

type SortField = 'ticker' | 'explosivePotential' | 'changePercent' | 'volume';
type SortDirection = 'asc' | 'desc';

function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

function getExplosivePotentialColor(score: number): string {
  if (score >= 75) return 'bg-explosive-high text-white';
  if (score >= 50) return 'bg-explosive-medium text-white';
  return 'bg-explosive-low text-foreground';
}

export function ScanResultsTable({ results, onSelectResult, isLoading }: ScanResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('explosivePotential');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return multiplier * aVal.localeCompare(bVal);
    }
    return multiplier * ((aVal as number) - (bVal as number));
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-muted-foreground">No results yet. Run a scan to find opportunities.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-4 font-semibold text-sm">
                <button
                  onClick={() => handleSort('ticker')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  Ticker
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left p-4 font-semibold text-sm">Company</th>
              <th className="text-right p-4 font-semibold text-sm">Price</th>
              <th className="text-right p-4 font-semibold text-sm">
                <button
                  onClick={() => handleSort('changePercent')}
                  className="flex items-center gap-1 hover:text-primary ml-auto"
                >
                  Change
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-right p-4 font-semibold text-sm">
                <button
                  onClick={() => handleSort('volume')}
                  className="flex items-center gap-1 hover:text-primary ml-auto"
                >
                  Volume
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-center p-4 font-semibold text-sm">
                <button
                  onClick={() => handleSort('explosivePotential')}
                  className="flex items-center gap-1 hover:text-primary mx-auto"
                >
                  Explosive
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-center p-4 font-semibold text-sm">Momentum</th>
              <th className="text-center p-4 font-semibold text-sm">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result) => (
              <tr
                key={result.ticker}
                onClick={() => onSelectResult(result)}
                className="border-b border-border hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <td className="p-4">
                  <span className="font-bold text-foreground">{result.ticker}</span>
                </td>
                <td className="p-4">
                  <div>
                    <p className="font-medium text-sm text-foreground">{result.companyName}</p>
                    <p className="text-xs text-muted-foreground">{result.sector}</p>
                  </div>
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  ${result.price.toFixed(2)}
                </td>
                <td className="p-4 text-right">
                  <div className={cn(
                    'flex items-center justify-end gap-1 font-semibold text-sm',
                    result.changePercent > 0 ? 'text-success' : 'text-danger'
                  )}>
                    {result.changePercent > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {result.changePercent > 0 ? '+' : ''}
                    {result.changePercent.toFixed(2)}%
                  </div>
                </td>
                <td className="p-4 text-right font-mono text-sm text-muted-foreground">
                  {formatNumber(result.volume)}
                </td>
                <td className="p-4">
                  <div className="flex justify-center">
                    <Badge className={cn('font-bold', getExplosivePotentialColor(result.explosivePotential))}>
                      {result.explosivePotential}
                    </Badge>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-center">
                    <Badge variant="outline">{result.momentumGrade}</Badge>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-center">
                    <Badge
                      variant={result.sentiment === 'Long' ? 'default' : result.sentiment === 'Short' ? 'destructive' : 'secondary'}
                    >
                      {result.sentiment}
                    </Badge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
