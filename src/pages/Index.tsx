import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ScanControls } from '@/components/scan/ScanControls';
import { ScanSummaryBar } from '@/components/scan/ScanSummaryBar';
import { ScanResultsTable } from '@/components/scan/ScanResultsTable';
import { ScanDetailDrawer } from '@/components/scan/ScanDetailDrawer';
import { FiltersSummary } from '@/components/scan/FiltersSummary';
import { Button } from '@/components/ui/button';
import { ScanMode, ScanFilters, ScanResult, ScanRequest, SavedScanProfile, WatchlistItem, ScanHistoryEntry } from '@/lib/types';
import { runScan } from '@/lib/scanEngine';
import { storage } from '@/lib/storage';
import { exportScanResultsToCsv, downloadCsv, generateTimestampedFilename } from '@/lib/export';
import { toast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';

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

  // Saved Scans State
  const [savedScans, setSavedScans] = useState<SavedScanProfile[]>([]);

  // Watchlist State
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // Scan History State
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const initialSaved = storage.getSavedScans();
    const initialWatchlist = storage.getWatchlist();
    const initialHistory = storage.getScanHistory();
    
    setSavedScans(initialSaved);
    setWatchlist(initialWatchlist);
    setScanHistory(initialHistory);
  }, []);

  // Persist saved scans to localStorage
  useEffect(() => {
    storage.setSavedScans(savedScans);
  }, [savedScans]);

  // Persist watchlist to localStorage
  useEffect(() => {
    storage.setWatchlist(watchlist);
  }, [watchlist]);

  // Persist scan history to localStorage
  useEffect(() => {
    storage.setScanHistory(scanHistory);
  }, [scanHistory]);

  // Calculate summary metrics
  const averageExplosivePotential = results.length > 0
    ? results.reduce((sum, r) => sum + r.explosivePotential, 0) / results.length
    : 0;
  
  const highRiskCount = results.filter(r => r.riskLevel === 'High').length;

  const handleRunScan = async () => {
    setIsScanning(true);
    setResults([]);
    setSelectedResult(null);

    // Import filter utilities
    const { normalizeFilters } = await import('@/lib/filterUtils');

    const request: ScanRequest = {
      mode: scanMode,
      filters: normalizeFilters(filters),
    };

    try {
      const scanResults = await runScan(request, 'live');
      setResults(scanResults);
      setLastRunAt(new Date().toLocaleTimeString());
      
      // Log to scan history
      logScanToHistory(request, scanResults.length);
      
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
      console.error('Scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'An error occurred while scanning. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Helper to log scan to history
  const logScanToHistory = async (request: ScanRequest, resultCount: number) => {
    const { buildFiltersSummary } = await import('@/lib/filterUtils');
    const filtersSummary = buildFiltersSummary(request.filters);
    
    const entry: ScanHistoryEntry = {
      id: crypto.randomUUID?.() ?? `h-${Date.now()}`,
      runAt: new Date().toISOString(),
      mode: request.mode,
      dataMode: 'live',
      filtersSummary,
      resultCount,
    };

    setScanHistory(prev => [entry, ...prev].slice(0, 50)); // Keep last 50
  };

  // Save current scan configuration as a profile
  const handleSaveProfile = async () => {
    const name = window.prompt('Enter a name for this scan profile:');
    if (!name) return;

    const { normalizeFilters } = await import('@/lib/filterUtils');

    const description = window.prompt('Enter a description (optional):') || undefined;

    const profile: SavedScanProfile = {
      id: crypto.randomUUID?.() ?? `profile-${Date.now()}`,
      name,
      description,
      mode: scanMode,
      filters: normalizeFilters(filters),
      createdAt: new Date().toISOString(),
    };

    setSavedScans(prev => [...prev, profile]);
    
    toast({
      title: 'Profile Saved',
      description: `"${name}" saved successfully`,
    });
  };

  // Load a saved profile
  const handleLoadProfile = (profile: SavedScanProfile) => {
    setScanMode(profile.mode);
    setFilters(profile.filters);
    
    toast({
      title: 'Profile Loaded',
      description: `"${profile.name}" configuration loaded`,
    });
  };

  // Delete a saved profile
  const handleDeleteProfile = (id: string) => {
    setSavedScans(prev => prev.filter(p => p.id !== id));
    
    toast({
      title: 'Profile Deleted',
      description: 'Scan profile removed',
    });
  };

  // Add result to watchlist
  const handleAddToWatchlist = (result: ScanResult) => {
    const alreadyIn = watchlist.some(w => w.result.ticker === result.ticker);
    if (alreadyIn) {
      toast({
        title: 'Already in Watchlist',
        description: `${result.ticker} is already in your watchlist`,
        variant: 'destructive',
      });
      return;
    }

    const item: WatchlistItem = {
      id: crypto.randomUUID?.() ?? `w-${Date.now()}-${result.ticker}`,
      fromScanMode: result.scanMode,
      addedAt: new Date().toISOString(),
      result,
    };

    setWatchlist(prev => [...prev, item]);
    
    toast({
      title: 'Added to Watchlist',
      description: `${result.ticker} added to watchlist`,
    });
  };

  // Remove result from watchlist
  const handleRemoveFromWatchlist = (result: ScanResult) => {
    setWatchlist(prev => prev.filter(w => w.result.ticker !== result.ticker));
    
    toast({
      title: 'Removed from Watchlist',
      description: `${result.ticker} removed from watchlist`,
    });
  };

  // Remove watchlist item by ID
  const handleRemoveWatchlistItem = (id: string) => {
    setWatchlist(prev => prev.filter(w => w.id !== id));
  };

  // Select a watchlist item to view details
  const handleSelectWatchlistItem = (item: WatchlistItem) => {
    setSelectedResult(item.result);
  };

  // Check if current selected result is in watchlist
  const isSelectedInWatchlist = selectedResult
    ? watchlist.some(w => w.result.ticker === selectedResult.ticker)
    : false;

  // Handle CSV export
  const handleExportCsv = () => {
    if (results.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'Run a scan first to generate results for export',
        variant: 'destructive',
      });
      return;
    }

    try {
      const csv = exportScanResultsToCsv(results);
      const filename = generateTimestampedFilename('detonation-scan', 'csv');
      downloadCsv(csv, filename);

      toast({
        title: 'Export Successful',
        description: `Downloaded ${results.length} results as ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting data',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppShell 
      currentMode={scanMode} 
      onModeChange={setScanMode}
      savedScans={savedScans}
      onLoadProfile={handleLoadProfile}
      onDeleteProfile={handleDeleteProfile}
      watchlist={watchlist}
      onSelectWatchlistItem={handleSelectWatchlistItem}
      onRemoveWatchlistItem={handleRemoveWatchlistItem}
      scanHistory={scanHistory}
    >
      <div className="p-6 space-y-6">
        <ScanControls
          mode={scanMode}
          filters={filters}
          onFiltersChange={setFilters}
          onRunScan={handleRunScan}
          onSaveProfile={handleSaveProfile}
          isScanning={isScanning}
        />

        <FiltersSummary filters={filters} />

        <ScanSummaryBar
          mode={scanMode}
          resultCount={results.length}
          averageExplosivePotential={averageExplosivePotential}
          highRiskCount={highRiskCount}
          lastRunAt={lastRunAt}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Scan Results</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={results.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <ScanResultsTable
            results={results}
            onSelectResult={setSelectedResult}
            isLoading={isScanning}
          />
        </div>
      </div>

      <ScanDetailDrawer 
        result={selectedResult} 
        onClose={() => setSelectedResult(null)}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
        isInWatchlist={isSelectedInWatchlist}
      />
    </AppShell>
  );
};

export default Index;
