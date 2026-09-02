import React from 'react';
import { AlertOctagon, X } from 'lucide-react';

interface WarningItem {
  id: string;
  message: string;
  issuedBy: string;
  createdAt: string;
}

interface UserWarningsBannerProps {
  warnings: WarningItem[];
  onDismiss: (id: string) => void;
}

export const UserWarningsBanner: React.FC<UserWarningsBannerProps> = ({ warnings, onDismiss }) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {warnings.map((w) => (
        <div
          key={w.id}
          className="glass-panel p-4 rounded-xl border border-amber-800/80 bg-amber-950/60 text-amber-200 flex items-start justify-between shadow-lg glow-rose"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-900/80 rounded-lg text-amber-300 mt-0.5">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-100 text-sm">Official Warning Notice</span>
                <span className="text-[10px] bg-amber-900/60 px-2 py-0.5 rounded text-amber-300 font-mono">
                  Issued by Admin ({w.issuedBy})
                </span>
              </div>
              <p className="text-xs text-amber-200 mt-1 font-medium">{w.message}</p>
            </div>
          </div>

          <button
            onClick={() => onDismiss(w.id)}
            className="p-1 hover:bg-amber-500/10 rounded-lg text-amber-400 hover:text-amber-100 transition-colors ml-4"
            title="Acknowledge & Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
