import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity } from 'lucide-react';

/**
 * Settings Panel
 * 
 * Displays engine configuration and status information.
 */
export function SettingsPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-3">
          Engine Settings
        </h3>
        <Card className="p-4 bg-sidebar-accent/30 border-sidebar-border">
          <Label className="text-xs font-semibold text-sidebar-foreground mb-3 block">
            Data Source
          </Label>
          
          <Alert className="border-sidebar-border bg-sidebar-accent/50">
            <Activity className="h-4 w-4" />
            <AlertDescription className="text-xs text-sidebar-foreground/80">
              Connected to live market data APIs (Finnhub, Benzinga Pro).
              All scan results reflect real-time market conditions.
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    </div>
  );
}
