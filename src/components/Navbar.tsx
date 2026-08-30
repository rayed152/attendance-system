import React from 'react';
import { LogOut, User as UserIcon, ShieldCheck, LayoutDashboard, Settings } from 'lucide-react';

interface NavbarProps {
  user: {
    userId: string;
    name: string;
    role: 'USER' | 'ADMIN';
  };
  activeTab: 'user' | 'admin';
  onTabChange: (tab: 'user' | 'admin') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, activeTab, onTabChange, onLogout }) => {
  const isAdmin = user.role === 'ADMIN';

  return (
    <header className="glass-panel sticky top-0 z-50 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">Attendance System</h1>
            <p className="text-[11px] text-slate-400">Desktop Verification Portal</p>
          </div>
        </div>

        {/* Tab switcher for Admin */}
        {isAdmin && (
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onTabChange('user')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'user'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>My Attendance</span>
            </button>
            <button
              onClick={() => onTabChange('admin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-slate-800">
          <UserIcon className="w-4 h-4 text-sky-400" />
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-200 leading-none">
                {user.name}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-sky-950 text-sky-400 border border-sky-800'
                }`}
              >
                {user.role}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              ID: {user.userId}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-medium transition-all duration-200"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
