import { ScanResult } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanDetailDrawerProps {
  result: ScanResult | null;
  onClose: () => void;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(0)}`;
}

function getExplosivePotentialColor(score: number): string {
  if (score >= 75) return 'bg-explosive-high text-white';
  if (score >= 50) return 'bg-explosive-medium text-white';
  return 'bg-explosive-low text-foreground';
}

export function ScanDetailDrawer({ result, onClose }: ScanDetailDrawerProps) {
  if (!result) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-foreground">{result.ticker}</h2>
                <Badge
                  variant={result.sentiment === 'Long' ? 'default' : result.sentiment === 'Short' ? 'destructive' : 'secondary'}
                >
                  {result.sentiment}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">{result.companyName}</p>
              <p className="text-sm text-muted-foreground">{result.sector}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Current Price</p>
              <p className="text-2xl font-bold text-foreground">${result.price.toFixed(2)}</p>
              <p className={cn(
                'text-sm font-semibold mt-1',
                result.changePercent > 0 ? 'text-success' : 'text-danger'
              )}>
                {result.changePercent > 0 ? '+' : ''}{result.changePercent.toFixed(2)}%
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Volume</p>
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(result.volume)}
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(result.marketCap)}
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Float</p>
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(result.float)}
              </p>
            </Card>
          </div>

          {/* Explosive Potential & Momentum */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 text-center">
              <Zap className="w-8 h-8 mx-auto mb-3 text-explosive-medium" />
              <p className="text-sm text-muted-foreground mb-2">Explosive Potential</p>
              <div className={cn(
                'inline-block px-4 py-2 rounded-full text-3xl font-bold',
                getExplosivePotentialColor(result.explosivePotential)
              )}>
                {result.explosivePotential}
              </div>
            </Card>

            <Card className="p-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground mb-2">Momentum Grade</p>
              <div className="text-4xl font-bold text-foreground">
                {result.momentumGrade}
              </div>
            </Card>
          </div>

          {/* Catalyst Summary */}
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Catalyst Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.catalystSummary}
                </p>
              </div>
            </div>
          </Card>

          {/* Risk Notes */}
          <Card className="p-5 border-destructive/20 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Risk Assessment</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.riskNotes}
                </p>
              </div>
            </div>
          </Card>

          {/* Why This Might Move */}
          <Card className="p-5 bg-accent/30">
            <h3 className="font-semibold text-foreground mb-3">Why This Might Move</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{result.catalystSummary}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Strong {result.momentumGrade} grade momentum indicating sustained interest</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Explosive potential score of {result.explosivePotential} suggests significant upside</span>
              </li>
            </ul>
          </Card>

          {/* Tags */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {result.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
