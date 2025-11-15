import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ScanControls } from '@/components/scan/ScanControls';
import { ScanSummaryBar } from '@/components/scan/ScanSummaryBar';
import { ScanResultsTable } from '@/components/scan/ScanResultsTable';
import { ScanDetailDrawer } from '@/components/scan/ScanDetailDrawer';
import { ScanMode, ScanFilters, ScanResult, ScanRequest } from '@/lib/types';
import { runScan } from '@/lib/scanEngine';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [scanMode, setScanMode] = useState<ScanMode>('daily-volatility');
  const [filters, setFilters] = useState<ScanFilters>({
    marketCap: 'any',
    minPrice: undefined,
    maxPrice: undefined,
    minVolume: undefined,
    sectors: [],
  });
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | undefined>(undefined);

  // Calculate summary metrics
  const averageExplosivePotential = results.length > 0
    ? results.reduce((sum, r) => sum + r.explosivePotential, 0) / results.length
    : 0;
  
  const highRiskCount = results.filter(r => r.riskLevel === 'High').length;

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
      setLastRunAt(new Date().toLocaleTimeString());
      
      if (scanResults.length === 0) {
        toast({
          title: 'No Results',
          description: 'No candidates found with these filters. Try widening your criteria.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Scan Complete',
          description: `Found ${scanResults.length} opportunities`,
        });
      }
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

        <ScanSummaryBar
          mode={scanMode}
          resultCount={results.length}
          averageExplosivePotential={averageExplosivePotential}
          highRiskCount={highRiskCount}
          lastRunAt={lastRunAt}
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
