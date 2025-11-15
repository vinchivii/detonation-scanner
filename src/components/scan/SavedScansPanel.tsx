import { SavedScanProfile, SCAN_MODE_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SavedScansPanelProps {
  savedScans: SavedScanProfile[];
  onLoadProfile: (profile: SavedScanProfile) => void;
  onDeleteProfile?: (id: string) => void;
}

export function SavedScansPanel({
  savedScans,
  onLoadProfile,
  onDeleteProfile,
}: SavedScansPanelProps) {
  if (savedScans.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-sidebar-foreground/50 italic">
          No saved scans yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {savedScans.map((profile) => (
        <div
          key={profile.id}
          className="group relative flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-colors"
          onClick={() => onLoadProfile(profile)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {SCAN_MODE_LABELS[profile.mode]}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
                <Calendar className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            {profile.description && (
              <p className="text-xs text-sidebar-foreground/60 mt-1 truncate">
                {profile.description}
              </p>
            )}
          </div>
          {onDeleteProfile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProfile(profile.id);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
