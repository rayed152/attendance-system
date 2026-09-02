import React, { useState, useEffect } from 'react';
import { KeyRound, Building2, ArrowRight, Loader2, Search, PlusCircle, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { RegisterCompanyModal } from '../components/RegisterCompanyModal';
import { Alert } from '../components/Alert';

interface LicenseSetupProps {
  onActivated: (tenant: any) => void;
}

export const LicenseSetup: React.FC<LicenseSetupProps> = ({ onActivated }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Search verified company licenses as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await window.electronAPI.tenant.searchOrganizations(searchQuery.trim());
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error('Error searching organizations:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!licenseKey.trim()) {
      setError('Please enter your Company License Key.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.electronAPI.tenant.validateLicenseKey(licenseKey.trim());
      if (res.success && res.tenant) {
        onActivated(res.tenant);
      } else {
        setError(res.message || 'Invalid or pending verification License Key.');
      }
    } catch (err) {
      console.error('License validation error:', err);
      setError('Error validating license key.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKey = (key: string) => {
    setLicenseKey(key);
  };

  const handleCompanyRegistered = (message: string, key: string) => {
    setInfoMsg(message);
    setLicenseKey(key);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Ambient Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-600 shadow-xl shadow-indigo-500/20 mb-2">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Company License Activation</h1>
          <p className="text-slate-400 text-sm">Bind this desktop app to your verified company license</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-slate-800 space-y-6">
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          {infoMsg && (
            <div className="glass-panel p-4 rounded-xl border border-sky-800/80 bg-sky-950/60 text-sky-200 text-xs font-medium space-y-2 shadow-lg glow-blue">
              <div className="flex items-center gap-2 font-bold text-sky-100">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Verification Pending</span>
              </div>
              <p className="leading-relaxed">{infoMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="licenseKey" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Company License Key
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="licenseKey"
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="e.g. ACME-2026-KEY"
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-600 outline-none transition-all duration-200 uppercase font-mono tracking-wider text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validating License...</span>
                </>
              ) : (
                <>
                  <span>Activate Verified License</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Search Verified Company Key */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-sky-400" />
                Search Verified Company Keys
              </label>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Register Company
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company name (e.g. Acme, Globex)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 placeholder-slate-600 outline-none text-xs focus:border-sky-500"
              />
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Search Results list - ONLY verified companies display */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-xl border border-slate-800 max-h-40 overflow-y-auto font-mono text-xs">
                {searchResults.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelectKey(org.licenseKey)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 text-left transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-200 font-bold font-sans">
                        <span>{org.name}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      </div>
                      <span className="text-[10px] text-sky-400 block">{org.licenseKey}</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 group-hover:text-slate-100">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal for Registering a new Company License */}
        <RegisterCompanyModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onRegistered={handleCompanyRegistered}
        />

        <div className="text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Verified Multi-Tenant SaaS Infrastructure
        </div>
      </div>
    </div>
  );
};
