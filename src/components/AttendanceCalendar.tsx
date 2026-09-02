import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  UserX,
  CheckCircle2,
  Loader2,
  CalendarOff,
} from 'lucide-react';
import { Alert } from './Alert';

interface OffDayItem {
  id: string;
  date: string;
  label: string | null;
}

interface AbsentUser {
  userId: string;
  name: string;
}

interface AbsentSummary {
  isWorkingDay: boolean;
  offDayLabel?: string | null;
  absentUsers: AbsentUser[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (n: number): string => String(n).padStart(2, '0');
const toDateStr = (year: number, month: number, day: number): string => `${year}-${pad2(month + 1)}-${pad2(day)}`;

const todayLocalStr = (): string => {
  const now = new Date();
  return toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
};

export const AttendanceCalendar: React.FC = () => {
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [draftWorkingDays, setDraftWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [savingWorkingDays, setSavingWorkingDays] = useState(false);

  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [offDays, setOffDays] = useState<OffDayItem[]>([]);
  const [loadingOffDays, setLoadingOffDays] = useState(false);
  const [togglingDate, setTogglingDate] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(todayLocalStr());
  const [absentSummary, setAbsentSummary] = useState<AbsentSummary | null>(null);
  const [loadingAbsent, setLoadingAbsent] = useState(false);

  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

  const monthKey = `${viewDate.getFullYear()}-${pad2(viewDate.getMonth() + 1)}`;

  const fetchWorkingDays = useCallback(async () => {
    try {
      const res = await window.electronAPI.admin.getConfig();
      if (res.success && res.data?.workingDays) {
        setWorkingDays(res.data.workingDays);
        setDraftWorkingDays(res.data.workingDays);
      }
    } catch (err) {
      console.error('Error fetching working days:', err);
    }
  }, []);

  const fetchOffDays = useCallback(async () => {
    setLoadingOffDays(true);
    try {
      const res = await window.electronAPI.admin.getOffDays(monthKey);
      if (res.success && res.data) {
        setOffDays(res.data);
      }
    } catch (err) {
      console.error('Error fetching off days:', err);
    } finally {
      setLoadingOffDays(false);
    }
  }, [monthKey]);

  const fetchAbsentSummary = useCallback(async (date: string) => {
    setLoadingAbsent(true);
    try {
      const res = await window.electronAPI.admin.getAbsentUsers(date);
      if (res.success && res.data) {
        setAbsentSummary(res.data);
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to fetch absent users.' });
      }
    } catch (err) {
      console.error('Error fetching absent summary:', err);
      setAlert({ type: 'error', message: 'Error fetching absent summary.' });
    } finally {
      setLoadingAbsent(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkingDays();
  }, [fetchWorkingDays]);

  useEffect(() => {
    fetchOffDays();
  }, [fetchOffDays]);

  useEffect(() => {
    fetchAbsentSummary(selectedDate);
  }, [selectedDate, fetchAbsentSummary]);

  const toggleDraftDay = (day: number) => {
    setDraftWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const workingDaysDirty = JSON.stringify(draftWorkingDays) !== JSON.stringify(workingDays);

  const handleSaveWorkingDays = async () => {
    setSavingWorkingDays(true);
    try {
      const res = await window.electronAPI.admin.updateWorkingDays(draftWorkingDays);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'Working days updated.' });
        setWorkingDays(draftWorkingDays);
        fetchAbsentSummary(selectedDate);
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to update working days.' });
      }
    } catch (err) {
      console.error('Error updating working days:', err);
      setAlert({ type: 'error', message: 'Error updating working days.' });
    } finally {
      setSavingWorkingDays(false);
    }
  };

  const offDayMap = new Map(offDays.map((o) => [o.date, o]));

  const handleToggleOffDay = async (dateStr: string, isCurrentlyOff: boolean) => {
    setTogglingDate(dateStr);
    try {
      const res = isCurrentlyOff
        ? await window.electronAPI.admin.removeOffDay(dateStr)
        : await window.electronAPI.admin.setOffDay({ date: dateStr, label: 'Holiday' });

      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'Calendar updated.' });
        fetchOffDays();
        if (dateStr === selectedDate) fetchAbsentSummary(selectedDate);
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to update off day.' });
      }
    } catch (err) {
      console.error('Error toggling off day:', err);
      setAlert({ type: 'error', message: 'Error updating off day.' });
    } finally {
      setTogglingDate(null);
    }
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayLocalStr();

  return (
    <div className="space-y-6">
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Working Days Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-sky-400" />
              Weekly Working Days
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select which days of the week count as working days. Absences are only tracked on working days.
            </p>
          </div>
          <button
            onClick={handleSaveWorkingDays}
            disabled={!workingDaysDirty || savingWorkingDays}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-600"
          >
            {savingWorkingDays ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, idx) => {
            const isSelected = draftWorkingDays.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => toggleDraftDay(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  isSelected
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-sky-400" />
            Off Days Calendar
          </h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-200 font-mono min-w-[140px] text-center">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Click a working day to mark it as an Off Day (holiday). Click a marked Off Day to undo it. Weekly-off days can't be toggled here.
        </p>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">
              {label}
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 gap-1.5 ${loadingOffDays ? 'opacity-60' : ''}`}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} className="aspect-square" />;

            const dateStr = toDateStr(year, month, day);
            const weekday = new Date(year, month, day).getDay();
            const isWeeklyOff = !workingDays.includes(weekday);
            const offDay = offDayMap.get(dateStr);
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const isClickable = !isWeeklyOff;

            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(dateStr);
                  if (isClickable) handleToggleOffDay(dateStr, !!offDay);
                }}
                disabled={togglingDate === dateStr}
                title={offDay ? offDay.label || 'Off Day' : isWeeklyOff ? 'Weekly Off' : dateStr}
                className={`aspect-square rounded-lg text-xs font-mono font-semibold flex flex-col items-center justify-center gap-0.5 border transition-all relative ${
                  offDay
                    ? 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                    : isWeeklyOff
                    ? 'bg-slate-900/60 text-slate-600 border-slate-900 cursor-default'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-sky-700 hover:text-slate-100 cursor-pointer'
                } ${isSelected ? 'ring-2 ring-sky-500' : ''} ${isToday ? 'font-black' : ''}`}
              >
                {togglingDate === dateStr ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <span>{day}</span>
                    {isToday && <span className="w-1 h-1 rounded-full bg-sky-400" />}
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-950/70 border border-rose-800/60" />
            Off Day (holiday)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-900/60 border border-slate-900" />
            Weekly Off
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded ring-2 ring-sky-500" />
            Selected
          </div>
        </div>
      </div>

      {/* Absent Summary Card */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <UserX className="w-4 h-4 text-rose-400" />
            Absent Summary
          </h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 text-xs font-mono outline-none focus:border-sky-500"
          />
        </div>

        <div className="p-6">
          {loadingAbsent ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : !absentSummary?.isWorkingDay ? (
            <div className="text-center py-6 text-slate-400">
              <CalendarOff className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">
                {absentSummary?.offDayLabel ? `Off Day: ${absentSummary.offDayLabel}` : 'Weekly Off Day'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Absence isn't tracked on non-working days.</p>
            </div>
          ) : absentSummary.absentUsers.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-medium text-slate-300">Everyone showed up</p>
              <p className="text-xs text-slate-500 mt-1">No absences recorded for this working day.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-semibold mb-3">
                {absentSummary.absentUsers.length} {absentSummary.absentUsers.length === 1 ? 'user' : 'users'} absent
              </p>
              {absentSummary.absentUsers.map((u) => (
                <div
                  key={u.userId}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50"
                >
                  <UserX className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{u.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">ID: {u.userId}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
