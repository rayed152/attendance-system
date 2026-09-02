import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';

interface AlertProps {
  type: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  if (!message) return null;

  return (
    <div
      className={clsx(
        'flex items-center justify-between p-4 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg border',
        {
          'bg-rose-950/80 border-rose-800/60 text-rose-200 glow-rose': type === 'error',
          'bg-emerald-950/80 border-emerald-800/60 text-emerald-200 glow-emerald': type === 'success',
          'bg-sky-950/80 border-sky-800/60 text-sky-200 glow-blue': type === 'info',
        }
      )}
    >
      <div className="flex items-center gap-3">
        {type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        {type === 'info' && <AlertCircle className="w-5 h-5 text-sky-400 shrink-0" />}
        <span>{message}</span>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-500/10 rounded-lg transition-colors ml-4 shrink-0 text-slate-400 hover:text-slate-100"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
