import { Badge } from '@/components/ui/badge';
import { Database, AlertCircle } from 'lucide-react';
import { appConfig } from '@/lib/config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Engine Status Indicator
 * 
 * Displays the current data mode (mock vs live) to help users understand
 * the source of data they're seeing.
 */
export function EngineStatus() {
  const isMockMode = appConfig.dataMode === 'mock';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isMockMode ? 'secondary' : 'default'}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium cursor-help"
          >
            {isMockMode ? (
              <>
                <Database className="w-3 h-3" />
                <span>Mock Data</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3" />
                <span>Live Data</span>
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">
            {isMockMode
              ? 'All results are generated from a simulated engine. Live market data wiring will come in a later phase.'
              : 'Connected to live market data APIs. Results reflect real-time market conditions.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
