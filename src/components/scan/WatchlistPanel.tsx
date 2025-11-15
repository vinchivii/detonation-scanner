import { WatchlistItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface WatchlistPanelProps {
  items: WatchlistItem[];
  onSelect?: (item: WatchlistItem) => void;
  onRemove?: (id: string) => void;
}

function getExplosivePotentialColor(score: number): string {
  if (score >= 75) return 'bg-explosive-high text-white';
  if (score >= 50) return 'bg-explosive-medium text-white';
  return 'bg-explosive-low text-foreground';
}

export function WatchlistPanel({ items, onSelect, onRemove }: WatchlistPanelProps) {
  if (items.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-sidebar-foreground/50 italic">
          No watchlist items yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-colors"
          onClick={() => onSelect?.(item)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-sidebar-foreground">
                {item.result.ticker}
              </p>
              <Badge
                className={cn('text-xs px-1.5 py-0', getExplosivePotentialColor(item.result.explosivePotential))}
              >
                {item.result.explosivePotential}
              </Badge>
            </div>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {item.result.companyName}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sidebar-foreground/60" />
                <span className={cn(
                  'text-xs font-semibold',
                  item.result.changePercent > 0 ? 'text-success' : 'text-danger'
                )}>
                  {item.result.changePercent > 0 ? '+' : ''}{item.result.changePercent.toFixed(1)}%
                </span>
              </div>
              <Badge
                variant={item.result.sentiment === 'Long' ? 'default' : item.result.sentiment === 'Short' ? 'destructive' : 'secondary'}
                className="text-xs px-1.5 py-0"
              >
                {item.result.sentiment}
              </Badge>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-sidebar-foreground/50">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(item.addedAt), { addSuffix: true })}</span>
            </div>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
