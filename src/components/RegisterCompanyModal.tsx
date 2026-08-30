import React, { useState } from 'react';
import { X, Building2, KeyRound, Clock, AlertCircle } from 'lucide-react';

interface RegisterCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (message: string, licenseKey: string) => void;
}

export const RegisterCompanyModal: React.FC<RegisterCompanyModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
}) => {
  const [name, setName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [adminUserId, setAdminUserId] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerateKey = () => {
    const prefix = companyCode.trim().toUpperCase() || 'COMPANY';
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    setLicenseKey(`${prefix}-2026-${randomHex}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !companyCode.trim() || !licenseKey.trim()) {
      setError('Company Name, Code, and License Key are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.electronAPI.tenant.registerOrganization({
        name: name.trim(),
        companyCode: companyCode.trim(),
        licenseKey: licenseKey.trim(),
        adminUserId: adminUserId.trim() || 'admin',
        adminPassword: adminPassword || 'admin123',
      });

      if (res.success) {
        onRegistered(
          res.message || `Company "${name}" registered! Verification takes 1–2 hours.`,
          licenseKey.trim()
        );
        // Reset form
        setName('');
        setCompanyCode('');
        setLicenseKey('');
        onClose();
      } else {
        setError(res.message || 'Failed to register company license.');
      }
    } catch (err: any) {
      console.error('Error registering organization:', err);
      setError('System error registering company license.');
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
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Register Company License</h3>
              <p className="text-xs text-slate-400">Request a new company tenant registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="text-xs text-rose-300 bg-rose-950/80 border border-rose-800/60 p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block font-semibold uppercase text-slate-300 mb-1">Company Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!companyCode) {
                  setCompanyCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                }
              }}
              placeholder="e.g. TechCorp Solutions"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 outline-none focus:border-indigo-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-300 mb-1">Company Code</label>
            <input
              type="text"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
              placeholder="e.g. techcorp"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500 text-sm"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold uppercase text-slate-300">License Key</label>
              <button
                type="button"
                onClick={handleGenerateKey}
                className="text-[10px] text-sky-400 hover:underline font-mono"
              >
                Auto Generate
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="e.g. TECHCORP-2026-KEY"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 font-mono text-sm uppercase outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block font-semibold uppercase text-slate-400 mb-1">Admin Username</label>
              <input
                type="text"
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-400 mb-1">Admin Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="admin123"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-amber-300 text-[11px] flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Registration requests are reviewed by system administrators. Verification takes 1–2 hours before the company license becomes active.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !companyCode.trim() || !licenseKey.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Building2 className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
