import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Loader2, Building2, RefreshCw } from 'lucide-react';
import { Alert } from '../components/Alert';

interface LoginProps {
  tenant: {
    name: string;
    companyCode: string;
    licenseKey: string;
  };
  onLoginSuccess: (user: any) => void;
  onSwitchLicense: () => void;
}

export const Login: React.FC<LoginProps> = ({ tenant, onLoginSuccess, onSwitchLicense }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId.trim() || !password) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setLoading(true);

    try {
      const response = await window.electronAPI.auth.login({
        userId: userId.trim(),
        password,
      });

      if (response.success && response.user) {
        onLoginSuccess(response.user);
      } else {
        setError(response.message || 'Authentication failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An error occurred while connecting to the system process.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-xl shadow-sky-500/20 mb-2">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Attendance System</h1>

          {/* Bound Company Tenant Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-800 text-xs font-semibold text-sky-400">
            <Building2 className="w-3.5 h-3.5" />
            <span>{tenant.name}</span>
            <button
              onClick={onSwitchLicense}
              className="ml-1 text-slate-500 hover:text-slate-200 transition-colors"
              title="Switch Company License"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-slate-800 space-y-6">
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                User ID
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. john123"
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-sky-600/25 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500 font-mono">
          Tenant License: {tenant.licenseKey}
        </div>
      </div>
    </div>
  );
};
