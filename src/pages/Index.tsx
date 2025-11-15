import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ScanControls } from '@/components/scan/ScanControls';
import { ScanResultsTable } from '@/components/scan/ScanResultsTable';
import { ScanDetailDrawer } from '@/components/scan/ScanDetailDrawer';
import { ScanMode, ScanFilters, ScanResult, ScanRequest } from '@/lib/types';
import { runScan } from '@/lib/scanEngine';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [scanMode, setScanMode] = useState<ScanMode>('daily-volatility');
  const [filters, setFilters] = useState<ScanFilters>({
    marketCapRanges: [],
    priceMin: 0,
    priceMax: 1000,
    sectors: [],
    minVolume: 500000,
  });
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);

  const handleRunScan = async () => {
    setIsScanning(true);
    setResults([]);
    setSelectedResult(null);

    const request: ScanRequest = {
      mode: scanMode,
      filters,
    };

    try {
      const scanResults = await runScan(request);
      setResults(scanResults);
      toast({
        title: 'Scan Complete',
        description: `Found ${scanResults.length} opportunities`,
      });
    } catch (error) {
      toast({
        title: 'Scan Failed',
        description: 'An error occurred while scanning. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <AppShell currentMode={scanMode} onModeChange={setScanMode}>
      <div className="p-6 space-y-6">
        <ScanControls
          mode={scanMode}
          filters={filters}
          onFiltersChange={setFilters}
          onRunScan={handleRunScan}
          isScanning={isScanning}
        />

        <ScanResultsTable
          results={results}
          onSelectResult={setSelectedResult}
          isLoading={isScanning}
        />
      </div>

      <ScanDetailDrawer result={selectedResult} onClose={() => setSelectedResult(null)} />
    </AppShell>
  );
};

export default Index;
