import React, { useState, useEffect } from 'react';
import { X, Save, Clock, FileText } from 'lucide-react';
import { AttendanceRecord } from '../../electron/services/attendance.service';

interface EditAttendanceModalProps {
  record: AttendanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: { id: string; type: 'ENTRY' | 'EXIT'; timestamp: string; note: string }) => Promise<void>;
}

export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (record) {
      setType(record.type);
      setDate(record.date);
      setTime(record.time);
      setNote(record.note || '');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine date and time to ISO string
      const dateTimeStr = `${date}T${time}`;
      const isoTimestamp = new Date(dateTimeStr).toISOString();

      await onSave({
        id: record.id,
        type,
        timestamp: isoTimestamp,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Error saving edited record:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-950 rounded-lg text-sky-400 border border-sky-800/60">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Attendance Record</h3>
              <p className="text-xs text-slate-400">User: {record.userName || record.userId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 font-semibold mb-1 uppercase">Event Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('ENTRY')}
                className={`py-2.5 rounded-xl font-bold transition-all border ${
                  type === 'ENTRY'
                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                ENTRY
              </button>
              <button
                type="button"
                onClick={() => setType('EXIT')}
                className={`py-2.5 rounded-xl font-bold transition-all border ${
                  type === 'EXIT'
                    ? 'bg-rose-950 border-rose-600 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                EXIT
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 uppercase">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1 uppercase">Time</label>
              <input
                type="time"
                step="1"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 uppercase flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              Edit Reason / Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Adjusted by Admin due to system clock drift"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500 font-sans"
            />
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
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-sky-600/20"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
