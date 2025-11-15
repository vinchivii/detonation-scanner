import { ScanMode, ScanFilters, SECTORS, SCAN_MODE_DESCRIPTIONS, MarketCapRange } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

interface ScanControlsProps {
  mode: ScanMode;
  filters: ScanFilters;
  onFiltersChange: (filters: ScanFilters) => void;
  onRunScan: () => void;
  isScanning: boolean;
}

const MARKET_CAP_OPTIONS: { value: MarketCapRange; label: string }[] = [
  { value: 'micro', label: 'Micro (<$300M)' },
  { value: 'small', label: 'Small ($300M-$2B)' },
  { value: 'mid', label: 'Mid ($2B-$10B)' },
  { value: 'any', label: 'Any Size' },
];

export function ScanControls({
  mode,
  filters,
  onFiltersChange,
  onRunScan,
  isScanning,
}: ScanControlsProps) {
  const setMarketCap = (cap: MarketCapRange) => {
    onFiltersChange({ ...filters, marketCap: cap });
  };

  const toggleSector = (sector: string) => {
    const newSectors = filters.sectors.includes(sector)
      ? filters.sectors.filter(s => s !== sector)
      : [...filters.sectors, sector];
    onFiltersChange({ ...filters, sectors: newSectors });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Mode Description */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Current Scan Mode</h3>
          <p className="text-sm text-muted-foreground">
            {SCAN_MODE_DESCRIPTIONS[mode]}
          </p>
        </div>

        {/* Market Cap Filter */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Market Cap Range</Label>
          <div className="flex flex-wrap gap-2">
            {MARKET_CAP_OPTIONS.map(({ value, label }) => (
              <Badge
                key={value}
                variant={filters.marketCap === value ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-accent"
                onClick={() => setMarketCap(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priceMin" className="text-sm font-semibold mb-2 block">
              Min Price ($)
            </Label>
            <Input
              id="priceMin"
              type="number"
              min="0"
              step="0.01"
              value={filters.minPrice || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, minPrice: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              placeholder="No minimum"
              className="bg-background"
            />
          </div>
          <div>
            <Label htmlFor="priceMax" className="text-sm font-semibold mb-2 block">
              Max Price ($)
            </Label>
            <Input
              id="priceMax"
              type="number"
              min="0"
              step="0.01"
              value={filters.maxPrice || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              placeholder="No maximum"
              className="bg-background"
            />
          </div>
        </div>

        {/* Sectors */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Sectors</Label>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map((sector) => (
              <Badge
                key={sector}
                variant={filters.sectors.includes(sector) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-accent"
                onClick={() => toggleSector(sector)}
              >
                {sector}
              </Badge>
            ))}
          </div>
          {filters.sectors.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({ ...filters, sectors: [] })}
              className="mt-2 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear sectors
            </Button>
          )}
        </div>

        {/* Min Volume */}
        <div>
          <Label htmlFor="minVolume" className="text-sm font-semibold mb-2 block">
            Minimum Volume
          </Label>
          <Input
            id="minVolume"
            type="number"
            min="0"
            step="100000"
            value={filters.minVolume || ''}
            onChange={(e) =>
              onFiltersChange({ ...filters, minVolume: e.target.value ? parseInt(e.target.value) : undefined })
            }
            placeholder="No minimum"
            className="bg-background"
          />
        </div>

        {/* Run Scan Button */}
        <Button
          onClick={onRunScan}
          disabled={isScanning}
          className="w-full"
          size="lg"
        >
          {isScanning ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
              Scanning Markets...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Run Scan
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
