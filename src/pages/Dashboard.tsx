import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { PageContainer } from '../components/PageContainer';
import { AttendanceTable } from '../components/AttendanceTable';
import { UserWarningsBanner } from '../components/UserWarningsBanner';
import { AdminDashboard } from './AdminDashboard';
import { Alert } from '../components/Alert';
import { LogIn, LogOut as LogOutIcon, Calendar, Clock, Loader2 } from 'lucide-react';
import { AttendanceRecord } from '../../electron/services/attendance.service';

interface DashboardProps {
  user: {
    id: string;
    userId: string;
    name: string;
    role: 'USER' | 'ADMIN';
    companyName?: string;
    logoUrl?: string | null;
  };
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT');
  const [entryUsedToday, setEntryUsedToday] = useState<boolean>(false);
  const [exitUsedToday, setExitUsedToday] = useState<boolean>(false);
  const [resetAt, setResetAt] = useState<Date | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch status, history, and warnings on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh status once the daily reset (midnight) has passed, so the
  // Entry/Exit limits clear without needing a manual refresh.
  useEffect(() => {
    if (resetAt && currentDateTime >= resetAt) {
      fetchDashboardData();
    }
  }, [currentDateTime, resetAt]);

  const fetchDashboardData = async () => {
    try {
      const [statusRes, historyRes, warningsRes] = await Promise.all([
        window.electronAPI.attendance.getStatus(),
        window.electronAPI.attendance.getHistory(),
        window.electronAPI.attendance.getWarnings(),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data.status);
        setEntryUsedToday(!!statusRes.data.entryUsedToday);
        setExitUsedToday(!!statusRes.data.exitUsedToday);
        setResetAt(statusRes.data.resetAt ? new Date(statusRes.data.resetAt) : null);
      }

      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }

      if (warningsRes.success && warningsRes.data) {
        setWarnings(warningsRes.data);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleDismissWarning = async (warningId: string) => {
    try {
      await window.electronAPI.attendance.dismissWarning(warningId);
      setWarnings((prev) => prev.filter((w) => w.id !== warningId));
    } catch (err) {
      console.error('Error dismissing warning:', err);
    }
  };

  const handleEntry = async () => {
    setAlert(null);
    setLoadingAction(true);

    try {
      const res = await window.electronAPI.attendance.entry();
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'Entry recorded successfully.' });
        fetchDashboardData();
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to record Entry.' });
      }
    } catch (err: any) {
      console.error('Entry error:', err);
      setAlert({ type: 'error', message: 'Communication error recording Entry.' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleExit = async () => {
    setAlert(null);
    setLoadingAction(true);

    try {
      const res = await window.electronAPI.attendance.exit();
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'Exit recorded successfully.' });
        fetchDashboardData();
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to record Exit.' });
      }
    } catch (err: any) {
      console.error('Exit error:', err);
      setAlert({ type: 'error', message: 'Communication error recording Exit.' });
    } finally {
      setLoadingAction(false);
    }
  };

  const dateFormatted = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeFormatted = currentDateTime.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formatCountdown = (target: Date): string => {
    const diffMs = target.getTime() - currentDateTime.getTime();
    if (diffMs <= 0) return '0h 00m 00s';
    const totalSeconds = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const entryDisabled = loadingAction || status === 'IN' || entryUsedToday;
  const exitDisabled = loadingAction || status === 'OUT' || exitUsedToday;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full">
        {/* Render Admin Dashboard if Admin tab selected */}
        {activeTab === 'admin' && user.role === 'ADMIN' ? (
          <PageContainer>
            <AdminDashboard />
          </PageContainer>
        ) : (
          <PageContainer>
            {/* User Warning Notices Banner */}
            <UserWarningsBanner
              warnings={warnings}
              onDismiss={handleDismissWarning}
            />

            {/* Date and Time Banner */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-950/60 border border-sky-800/40 rounded-xl text-sky-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Today's Date</p>
                  <p className="text-lg font-bold text-slate-100">{dateFormatted}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-950/60 border border-indigo-800/40 rounded-xl text-indigo-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="text-right md:text-left">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Current Time</p>
                  <p className="text-2xl font-mono font-bold text-slate-100 tracking-widest">{timeFormatted}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/90 px-5 py-3 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold uppercase">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
                    status === 'IN'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 glow-emerald'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {status === 'IN' ? '● INSIDE (ENTRY)' : '○ OUTSIDE (EXIT)'}
                </span>
              </div>
            </div>

            {/* Action Alert Banner */}
            {alert && (
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            )}

            {/* Two Large Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ENTRY BUTTON */}
              <button
                onClick={handleEntry}
                disabled={entryDisabled}
                className={`group relative overflow-hidden rounded-2xl p-8 text-left transition-all duration-300 border flex flex-col justify-between h-48 shadow-xl ${
                  entryDisabled
                    ? 'bg-slate-900/40 border-slate-800/40 opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-br from-emerald-950/90 to-slate-900 border-emerald-800/60 hover:border-emerald-500/80 hover:shadow-emerald-900/30 hover:scale-[1.01] active:scale-[0.99] glow-emerald'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/60">
                    Check In
                  </span>
                  <LogIn className="w-8 h-8 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-1">ENTRY</h2>
                  {entryUsedToday && status !== 'IN' && resetAt ? (
                    <p className="text-xs text-amber-400 font-semibold">
                      Today's Entry used. Available again in {formatCountdown(resetAt)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Punctuality Rule: Entry after 9:00 AM marked as LATE</p>
                  )}
                </div>

                {loadingAction && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  </div>
                )}
              </button>

              {/* EXIT BUTTON */}
              <button
                onClick={handleExit}
                disabled={exitDisabled}
                className={`group relative overflow-hidden rounded-2xl p-8 text-left transition-all duration-300 border flex flex-col justify-between h-48 shadow-xl ${
                  exitDisabled
                    ? 'bg-slate-900/40 border-slate-800/40 opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-br from-rose-950/90 to-slate-900 border-rose-800/60 hover:border-rose-500/80 hover:shadow-rose-900/30 hover:scale-[1.01] active:scale-[0.99] glow-rose'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-bold tracking-widest text-rose-400 uppercase bg-rose-950/80 px-3 py-1 rounded-full border border-rose-800/60">
                    Check Out
                  </span>
                  <LogOutIcon className="w-8 h-8 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-1">EXIT</h2>
                  {exitUsedToday && status !== 'IN' && resetAt ? (
                    <p className="text-xs text-amber-400 font-semibold">
                      Today's Exit used. Available again in {formatCountdown(resetAt)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Punctuality Rule: Exit before 5:00 PM marked as EARLY EXIT</p>
                  )}
                </div>

                {loadingAction && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                  </div>
                )}
              </button>
            </div>

            {/* User Attendance History Section */}
            <AttendanceTable records={history} />
          </PageContainer>
        )}
      </main>
    </div>
  );
};
