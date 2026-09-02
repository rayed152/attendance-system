import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Settings2 } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: { lateEntryTime: string; earlyExitTime: string };
  onSave: (config: { lateEntryTime: string; earlyExitTime: string }) => Promise<void>;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  onSave,
}) => {
  const [lateEntryTime, setLateEntryTime] = useState('09:00');
  const [earlyExitTime, setEarlyExitTime] = useState('17:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setLateEntryTime(initialConfig.lateEntryTime || '09:00');
      setEarlyExitTime(initialConfig.earlyExitTime || '17:00');
    }
  }, [initialConfig]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ lateEntryTime, earlyExitTime });
      onClose();
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-950 rounded-lg text-indigo-400 border border-indigo-800/60">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Shift & Punctuality Thresholds</h3>
              <p className="text-xs text-slate-400">Configure Late Entry and Early Exit cutoff times</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-500/10 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Late Entry Threshold Time
            </label>
            <input
              type="time"
              value={lateEntryTime}
              onChange={(e) => setLateEntryTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 outline-none focus:border-amber-500 font-mono text-sm"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Entries logged after this time will be marked as <span className="text-amber-400 font-semibold">LATE ENTRY</span>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              Early Exit Threshold Time
            </label>
            <input
              type="time"
              value={earlyExitTime}
              onChange={(e) => setEarlyExitTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 outline-none focus:border-orange-500 font-mono text-sm"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Exits logged before this time will be marked as <span className="text-orange-400 font-semibold">EARLY EXIT</span>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
