import React, { useState, useEffect } from 'react';
import { LicenseSetup } from './pages/LicenseSetup';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [tenant, setTenant] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      if (window.electronAPI && window.electronAPI.tenant) {
        // 1. Check active bound tenant
        const tenantRes = await window.electronAPI.tenant.getActiveTenant();
        if (tenantRes.success && tenantRes.tenant) {
          setTenant(tenantRes.tenant);

          // 2. Check active user session
          const sessionUser = await window.electronAPI.auth.getSession();
          if (sessionUser) {
            setUser(sessionUser);
          }
        }
      }
    } catch (err) {
      console.error('App initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchLicense = async () => {
    try {
      await window.electronAPI.tenant.clearLicenseKey();
      setTenant(null);
      setUser(null);
    } catch (err) {
      console.error('Switch license error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.auth.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-mono">Initializing Multi-Tenant Attendance Core...</p>
      </div>
    );
  }

  // 1. If application is not bound to a company license key -> render License Setup
  if (!tenant) {
    return <LicenseSetup onActivated={(activeTenant) => setTenant(activeTenant)} />;
  }

  // 2. If bound to company but user is not logged in -> render Login
  if (!user) {
    return (
      <Login
        tenant={tenant}
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
        onSwitchLicense={handleSwitchLicense}
      />
    );
  }

  // 3. Authenticated user -> render Dashboard
  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;
