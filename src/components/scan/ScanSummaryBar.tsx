import { ScanMode, SCAN_MODE_LABELS, SCAN_MODE_DESCRIPTIONS } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, BarChart3, Target } from 'lucide-react';

interface ScanSummaryBarProps {
  mode: ScanMode;
  resultCount: number;
  averageExplosivePotential: number;
  highRiskCount: number;
  lastRunAt?: string;
}

export function ScanSummaryBar({
  mode,
  resultCount,
  averageExplosivePotential,
  highRiskCount,
  lastRunAt,
}: ScanSummaryBarProps) {
  const hasResults = resultCount > 0;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Mode Info */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="default" className="text-sm font-semibold px-3 py-1">
              Mode: {SCAN_MODE_LABELS[mode]}
            </Badge>
            {lastRunAt && (
              <span className="text-xs text-muted-foreground">
                Last run: {lastRunAt}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {SCAN_MODE_DESCRIPTIONS[mode]}
          </p>
        </div>

        {/* Metrics */}
        {hasResults ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
              <Target className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Candidates</p>
                <p className="text-2xl font-bold text-foreground">{resultCount}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg Explosive Score</p>
                <p className="text-2xl font-bold text-foreground">
                  {averageExplosivePotential.toFixed(0)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">High Risk Names</p>
                <p className="text-2xl font-bold text-foreground">{highRiskCount}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quality Score</p>
                <p className="text-2xl font-bold text-foreground">
                  {averageExplosivePotential > 70 ? 'A' : averageExplosivePotential > 55 ? 'B' : 'C'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Run a scan to see candidates and summary metrics
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
