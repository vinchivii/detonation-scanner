import { ScanHistoryEntry, SCAN_MODE_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Clock, Database } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ScanHistoryPanelProps {
  entries: ScanHistoryEntry[];
}

export function ScanHistoryPanel({ entries }: ScanHistoryPanelProps) {
  if (entries.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-sidebar-foreground/50 italic">
          No scan history yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto">
      {entries.slice(0, 20).map((entry) => {
        const runDate = new Date(entry.runAt);
        const isToday = new Date().toDateString() === runDate.toDateString();
        
        return (
          <div
            key={entry.id}
            className="px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {SCAN_MODE_LABELS[entry.mode]}
              </Badge>
              <Badge 
                variant={entry.dataMode === 'live' ? 'default' : 'secondary'}
                className="text-xs px-1.5 py-0"
              >
                {entry.dataMode === 'live' ? (
                  <>
                    <Database className="w-2.5 h-2.5 mr-1" />
                    Live
                  </>
                ) : (
                  'Mock'
                )}
              </Badge>
            </div>

            <p className="text-xs text-sidebar-foreground/70 mb-1 truncate">
              {entry.filtersSummary}
            </p>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-sidebar-foreground/60">
                <Clock className="w-3 h-3" />
                <span>
                  {isToday
                    ? format(runDate, 'HH:mm')
                    : formatDistanceToNow(runDate, { addSuffix: true })}
                </span>
              </div>
              <span className="text-sidebar-foreground/70 font-medium">
                {entry.resultCount} results
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
