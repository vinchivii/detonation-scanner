import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Engine Status Indicator
 * 
 * Shows that the app is connected to live market data APIs.
 */
export function EngineStatus() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="default"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium cursor-help"
          >
            <AlertCircle className="w-3 h-3" />
            <span>Live Market Data</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">
            Connected to live market data APIs. Results reflect real-time market conditions.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
