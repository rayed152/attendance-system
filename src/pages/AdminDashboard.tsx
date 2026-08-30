import React, { useState, useEffect } from 'react';
import { AttendanceTable } from '../components/AttendanceTable';
import { EditAttendanceModal } from '../components/EditAttendanceModal';
import { WarnUserModal } from '../components/WarnUserModal';
import { RegisterUserModal } from '../components/RegisterUserModal';
import { EditUserModal } from '../components/EditUserModal';
import { Alert } from '../components/Alert';
import {
  Users,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  FileSpreadsheet,
  UserPlus,
  Clock,
  Ban,
  Trash2,
  Edit,
  Building2,
  Palette,
  Lock,
  Search,
  CheckCircle2,
  Image as ImageIcon,
  Save,
} from 'lucide-react';
import { AttendanceRecord } from '../../electron/services/attendance.service';

interface UserItem {
  id: string;
  userId: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isBlocked?: boolean;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'settings' | 'theme'>('logs');

  // Data states
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Modals & Active Selections
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [warningTargetUserId, setWarningTargetUserId] = useState<string | null>(null);
  const [isWarnModalOpen, setIsWarnModalOpen] = useState<boolean>(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);

  // Company Settings & Thresholds
  const [companyName, setCompanyName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [lateEntryTime, setLateEntryTime] = useState<string>('09:00');
  const [earlyExitTime, setEarlyExitTime] = useState<string>('17:00');

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
        setLateEntryTime(res.data.lateEntryTime || '09:00');
        setEarlyExitTime(res.data.earlyExitTime || '17:00');
        if (res.data.companyName) setCompanyName(res.data.companyName);
        if (res.data.logoUrl) setLogoUrl(res.data.logoUrl);
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

  // Actions
  const handleFilterChange = (userId: string) => {
    setSelectedUserFilter(userId);
    fetchAttendanceRecords(userId);
  };

  const handleRegisterUser = async (input: { userId: string; name: string; password: string; role: 'USER' | 'ADMIN' }) => {
    try {
      const res = await window.electronAPI.admin.registerUser(input);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'User registered successfully.' });
        fetchUsers();
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to register user.' });
      }
    } catch (err) {
      console.error('Error registering user:', err);
      setAlert({ type: 'error', message: 'Error registering new user.' });
    }
  };

  const handleUpdateUser = async (input: { userId: string; name?: string; role?: 'USER' | 'ADMIN'; newPassword?: string }) => {
    try {
      const res = await window.electronAPI.admin.updateUser(input);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'User info updated.' });
        fetchUsers();
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to update user.' });
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setAlert({ type: 'error', message: 'Error updating user.' });
    }
  };

  const handleToggleBlock = async (targetUserId: string) => {
    try {
      const res = await window.electronAPI.admin.toggleBlockUser(targetUserId);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'User status updated.' });
        fetchUsers();
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to toggle block status.' });
      }
    } catch (err) {
      console.error('Error toggling block status:', err);
      setAlert({ type: 'error', message: 'Error updating user block status.' });
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!window.confirm(`Are you sure you want to kick/delete user "${targetUserId}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await window.electronAPI.admin.deleteUser(targetUserId);
      if (res.success) {
        setAlert({ type: 'success', message: res.message || 'User deleted.' });
        fetchUsers();
        fetchAttendanceRecords(selectedUserFilter);
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to delete user.' });
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setAlert({ type: 'error', message: 'Error deleting user.' });
    }
  };

  const handleSaveEditRecord = async (updated: { id: string; type: 'ENTRY' | 'EXIT'; timestamp: string; note: string }) => {
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [thresholdRes, brandingRes] = await Promise.all([
        window.electronAPI.admin.updateConfig({ lateEntryTime, earlyExitTime }),
        window.electronAPI.admin.updateBranding({ name: companyName, logoUrl }),
      ]);

      if (thresholdRes.success && brandingRes.success) {
        setAlert({ type: 'success', message: 'Company Branding and Shift Thresholds updated successfully.' });
        fetchAttendanceRecords(selectedUserFilter);
      } else {
        setAlert({ type: 'error', message: thresholdRes.message || brandingRes.message || 'Failed to update settings.' });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setAlert({ type: 'error', message: 'Error saving settings.' });
    }
  };

  // Metrics
  const lateCount = records.filter((r) => r.statusFlag === 'LATE').length;
  const earlyExitCount = records.filter((r) => r.statusFlag === 'EARLY_EXIT').length;

  const filteredUsersList = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.userId.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <div className="flex gap-6 items-start">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-52 shrink-0 glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 sticky top-24">
        <div className="px-3 py-2 border-b border-slate-800/80 mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin Control</h3>
        </div>

        <nav className="space-y-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'logs'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <Clock className="w-4 h-4" />
            <span>Attendance Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'users'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'settings'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company Settings</span>
          </button>

          {/* Theme Settings (Grayed Out) */}
          <button
            disabled
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-600 bg-slate-900/30 border border-slate-900 cursor-not-allowed opacity-60"
            title="Theme customization coming in future update"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-4 h-4 text-slate-600" />
              <span>Theme Settings</span>
            </div>
            <Lock className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </nav>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <section className="flex-1 min-w-0 space-y-6">
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* TAB 1: ATTENDANCE LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Total Users</p>
                  <p className="text-2xl font-bold text-white mt-1 font-mono">{users.length}</p>
                </div>
                <div className="p-3 bg-sky-950/60 rounded-xl text-sky-400 border border-sky-800/40">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Total Logs</p>
                  <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{records.length}</p>
                </div>
                <div className="p-3 bg-indigo-950/60 rounded-xl text-indigo-400 border border-indigo-800/40">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Late (&gt; {lateEntryTime})</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1 font-mono">{lateCount}</p>
                </div>
                <div className="p-3 bg-amber-950/60 rounded-xl text-amber-400 border border-amber-800/40">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Early Exits (&lt; {earlyExitTime})</p>
                  <p className="text-2xl font-bold text-orange-400 mt-1 font-mono">{earlyExitCount}</p>
                </div>
                <div className="p-3 bg-orange-950/60 rounded-xl text-orange-400 border border-orange-800/40">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-300 uppercase">Filter User:</label>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-sm font-sans outline-none focus:border-sky-500 min-w-[200px]"
                >
                  <option value="ALL">All Employees ({users.length})</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.userId}>
                      {u.name} ({u.userId}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => fetchAttendanceRecords(selectedUserFilter)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <AttendanceTable
              records={records}
              showUserColumn={true}
              onEditRecord={(rec) => setEditingRecord(rec)}
            />
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT (Register, Edit, Block, Kick) */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search user name or ID..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-slate-100 text-xs outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold shadow-lg transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Register New User
              </button>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-slate-800">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  Company Users Directory
                </h2>
                <span className="text-xs font-mono bg-slate-900 px-2.5 py-1 rounded-full text-slate-400 border border-slate-800">
                  {filteredUsersList.length} registered
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-900/60 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">User ID</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Account Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-100">
                          {u.name}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-400">
                          {u.userId}
                        </td>
                        <td className="px-6 py-3.5 font-mono">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'ADMIN'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-sky-950 text-sky-400 border border-sky-800'
                              }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-mono">
                          {u.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                              <Ban className="w-3 h-3" />
                              BLOCKED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800"
                              title="Edit user details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setWarningTargetUserId(u.userId);
                                setIsWarnModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60"
                              title="Issue Warning"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleBlock(u.userId)}
                              className={`px-2 py-1 rounded border ${u.isBlocked
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                : 'bg-orange-950/60 text-orange-300 border-orange-800/60'
                                }`}
                              title={u.isBlocked ? 'Unblock user' : 'Block / Suspend user'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.userId)}
                              className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60"
                              title="Kick / Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMPANY SETTINGS & BRANDING */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                Company Branding & Shift Rules
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configure company name, logo, and work shift thresholds</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Company Display Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  Company Logo URL / Image Link
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold uppercase text-amber-400 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Late Entry Cutoff Time
                  </label>
                  <input
                    type="time"
                    value={lateEntryTime}
                    onChange={(e) => setLateEntryTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm outline-none focus:border-amber-500"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Entries after this time are tagged LATE</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-orange-400 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Early Exit Cutoff Time
                  </label>
                  <input
                    type="time"
                    value={earlyExitTime}
                    onChange={(e) => setEarlyExitTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm outline-none focus:border-orange-500"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Exits before this time are tagged EARLY EXIT</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-sky-600/20"
              >
                <Save className="w-4 h-4" />
                Save Settings & Branding
              </button>
            </div>
          </form>
        )}
      </section>

      {/* MODALS */}
      <RegisterUserModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={handleRegisterUser}
      />

      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleUpdateUser}
      />

      <EditAttendanceModal
        record={editingRecord}
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleSaveEditRecord}
      />

      <WarnUserModal
        users={users}
        isOpen={isWarnModalOpen}
        onClose={() => {
          setIsWarnModalOpen(false);
          setWarningTargetUserId(null);
        }}
        onSendWarning={(userId, message) => handleSendWarning(userId || warningTargetUserId!, message)}
      />
    </div>
  );
};
