import { DataMode } from '@/lib/config';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface SettingsPanelProps {
  dataMode: DataMode;
  onChangeDataMode: (mode: DataMode) => void;
}

export function SettingsPanel({ dataMode, onChangeDataMode }: SettingsPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-3">
          Engine Settings
        </h3>
        <Card className="p-4 bg-sidebar-accent/30 border-sidebar-border">
          <Label className="text-xs font-semibold text-sidebar-foreground mb-3 block">
            Data Mode
          </Label>
          
          <RadioGroup value={dataMode} onValueChange={(value) => onChangeDataMode(value as DataMode)}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mock" id="mode-mock" />
                <Label
                  htmlFor="mode-mock"
                  className="text-sm text-sidebar-foreground cursor-pointer font-normal"
                >
                  Mock Data (Recommended)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="live" id="mode-live" />
                <Label
                  htmlFor="mode-live"
                  className="text-sm text-sidebar-foreground cursor-pointer font-normal"
                >
                  Live Data (Experimental)
                </Label>
              </div>
            </div>
          </RadioGroup>

          {dataMode === 'live' && (
            <Alert className="mt-4 border-sidebar-border bg-sidebar-accent/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs text-sidebar-foreground/80">
                Live mode uses a server-side API route to fetch real market data once configured.
                If not configured, the app will fall back to mock data with a warning.
              </AlertDescription>
            </Alert>
          )}
        </Card>
      </div>
    </div>
  );
}
