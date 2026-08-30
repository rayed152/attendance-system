import React, { useState, useEffect } from 'react';
import { AttendanceTable } from '../components/AttendanceTable';
import { EditAttendanceModal } from '../components/EditAttendanceModal';
import { WarnUserModal } from '../components/WarnUserModal';
import { ConfigModal } from '../components/ConfigModal';
import { Alert } from '../components/Alert';
import { Users, AlertTriangle, RefreshCw, ShieldAlert, FileSpreadsheet, Settings2 } from 'lucide-react';
import { AttendanceRecord } from '../../electron/services/attendance.service';

interface UserItem {
  id: string;
  userId: string;
  name: string;
  role: string;
}

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isWarnModalOpen, setIsWarnModalOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [config, setConfig] = useState<{ lateEntryTime: string; earlyExitTime: string }>({
    lateEntryTime: '09:00',
    earlyExitTime: '17:00',
  });
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
    fetchConfig();
    fetchAttendanceRecords('ALL');
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await window.electronAPI.admin.getAllUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await window.electronAPI.admin.getConfig();
      if (res.success && res.data) {
        setConfig(res.data);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const fetchAttendanceRecords = async (userIdFilter: string) => {
    setLoading(true);
    try {
      const res = await window.electronAPI.admin.getAllAttendance(userIdFilter);
      if (res.success && res.data) {
        setRecords(res.data);
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to fetch attendance logs.' });
      }
    } catch (err) {
      console.error('Error fetching attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (userId: string) => {
    setSelectedUserFilter(userId);
    fetchAttendanceRecords(userId);
  };

  const handleSaveEdit = async (updated: { id: string; type: 'ENTRY' | 'EXIT'; timestamp: string; note: string }) => {
    try {
      const res = await window.electronAPI.admin.updateAttendance(updated);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'Attendance record updated.' });
        fetchAttendanceRecords(selectedUserFilter);
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to update record.' });
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      setAlert({ type: 'error', message: 'Error updating attendance record.' });
    }
  };

  const handleSendWarning = async (targetUserId: string, message: string) => {
    try {
      const res = await window.electronAPI.admin.warnUser(targetUserId, message);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'Warning issued.' });
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to send warning.' });
      }
    } catch (err) {
      console.error('Error sending warning:', err);
      setAlert({ type: 'error', message: 'Error issuing warning.' });
    }
  };

  const handleSaveConfig = async (newConfig: { lateEntryTime: string; earlyExitTime: string }) => {
    try {
      const res = await window.electronAPI.admin.updateConfig(newConfig);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'Punctuality thresholds updated.' });
        setConfig(newConfig);
        fetchAttendanceRecords(selectedUserFilter);
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to update thresholds.' });
      }
    } catch (err) {
      console.error('Error updating config:', err);
      setAlert({ type: 'error', message: 'Error saving threshold settings.' });
    }
  };

  // Metrics
  const lateCount = records.filter((r) => r.statusFlag === 'LATE').length;
  const earlyExitCount = records.filter((r) => r.statusFlag === 'EARLY_EXIT').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Registered Users</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{users.length}</p>
          </div>
          <div className="p-3 bg-sky-950/60 rounded-xl text-sky-400 border border-sky-800/40">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Attendance Logs</p>
            <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{records.length}</p>
          </div>
          <div className="p-3 bg-indigo-950/60 rounded-xl text-indigo-400 border border-indigo-800/40">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Late Entries (&gt; {config.lateEntryTime})</p>
            <p className="text-2xl font-bold text-amber-400 mt-1 font-mono">{lateCount}</p>
          </div>
          <div className="p-3 bg-amber-950/60 rounded-xl text-amber-400 border border-amber-800/40">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Early Exits (&lt; {config.earlyExitTime})</p>
            <p className="text-2xl font-bold text-orange-400 mt-1 font-mono">{earlyExitCount}</p>
          </div>
          <div className="p-3 bg-orange-950/60 rounded-xl text-orange-400 border border-orange-800/40">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Admin Actions & Filter Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-300 uppercase whitespace-nowrap">Filter User:</label>
          <select
            value={selectedUserFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-sm font-sans outline-none focus:border-sky-500 min-w-[200px]"
          >
            <option value="ALL">All Employees / Users ({users.length})</option>
            {users.map((u) => (
              <option key={u.id} value={u.userId}>
                {u.name} ({u.userId}) - {u.role}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-xs font-semibold shadow-lg transition-all"
            title="Configure Late Entry and Early Exit cutoff times"
          >
            <Settings2 className="w-4 h-4" />
            Set Thresholds ({config.lateEntryTime} / {config.earlyExitTime})
          </button>

          <button
            onClick={() => setIsWarnModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-semibold shadow-lg transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            Issue Warning
          </button>

          <button
            onClick={() => fetchAttendanceRecords(selectedUserFilter)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-all"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Attendance Table with User Column and Edit action */}
      <AttendanceTable
        records={records}
        showUserColumn={true}
        onEditRecord={(rec) => setEditingRecord(rec)}
      />

      {/* Edit Modal */}
      <EditAttendanceModal
        record={editingRecord}
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleSaveEdit}
      />

      {/* Warn Modal */}
      <WarnUserModal
        users={users}
        isOpen={isWarnModalOpen}
        onClose={() => setIsWarnModalOpen(false)}
        onSendWarning={handleSendWarning}
      />

      {/* Config Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        initialConfig={config}
        onSave={handleSaveConfig}
      />
    </div>
  );
};
