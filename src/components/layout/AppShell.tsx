import { ReactNode } from 'react';
import { Activity, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { ScanMode, SCAN_MODE_LABELS, SavedScanProfile, WatchlistItem, ScanHistoryEntry } from '@/lib/types';
import { SavedScansPanel } from '@/components/scan/SavedScansPanel';
import { WatchlistPanel } from '@/components/scan/WatchlistPanel';
import { ScanHistoryPanel } from '@/components/scan/ScanHistoryPanel';
import { SettingsPanel } from '@/components/system/SettingsPanel';
import { EngineStatus } from '@/components/system/EngineStatus';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  currentMode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  savedScans: SavedScanProfile[];
  onLoadProfile: (profile: SavedScanProfile) => void;
  onDeleteProfile: (id: string) => void;
  watchlist: WatchlistItem[];
  onSelectWatchlistItem: (item: WatchlistItem) => void;
  onRemoveWatchlistItem: (id: string) => void;
  scanHistory: ScanHistoryEntry[];
}

const SCAN_MODE_ICONS: Record<ScanMode, typeof Activity> = {
  'unified': Activity,
};

export function AppShell({ 
  children, 
  currentMode, 
  onModeChange,
  savedScans,
  onLoadProfile,
  onDeleteProfile,
  watchlist,
  onSelectWatchlistItem,
  onRemoveWatchlistItem,
  scanHistory,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Detonation</h1>
              <p className="text-xs text-sidebar-foreground/60">Scanner</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Scan Modes
            </p>
            {(Object.keys(SCAN_MODE_LABELS) as ScanMode[]).map((mode) => {
              const Icon = SCAN_MODE_ICONS[mode];
              const isActive = currentMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{SCAN_MODE_LABELS[mode]}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-sidebar-border">
            <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Saved Scans
            </p>
            <SavedScansPanel
              savedScans={savedScans}
              onLoadProfile={onLoadProfile}
              onDeleteProfile={onDeleteProfile}
            />
          </div>

          <div className="mt-8 pt-8 border-t border-sidebar-border">
            <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Scan History
            </p>
            <ScanHistoryPanel entries={scanHistory} />
          </div>

          <div className="mt-8 pt-8 border-t border-sidebar-border">
            <SettingsPanel />
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="bg-sidebar-accent/30 rounded-lg p-3">
            <p className="text-xs text-sidebar-foreground/70 leading-relaxed">
              <span className="font-semibold text-sidebar-primary">Live Market Data:</span> Connected to real-time market APIs for accurate scanning and analysis.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Stock Scanner</h1>
              <p className="text-sm text-muted-foreground">
                Hunt for explosive opportunities in the market
              </p>
            </div>
            <div className="flex items-center gap-3">
              <EngineStatus />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Market Status</p>
                <p className="text-sm font-semibold text-success">Live</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
