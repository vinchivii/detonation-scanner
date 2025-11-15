import { ScanFilters } from '@/lib/types';
import { buildFiltersSummary } from '@/lib/filterUtils';
import { Badge } from '@/components/ui/badge';

interface FiltersSummaryProps {
  filters: ScanFilters;
}

export function FiltersSummary({ filters }: FiltersSummaryProps) {
  const summary = buildFiltersSummary(filters);
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="font-medium">Active Filters:</span>
      <Badge variant="outline" className="font-mono text-xs">
        {summary}
      </Badge>
    </div>
  );
}
