import React, { useState } from 'react';
import { X, UserPlus, User, Lock, Shield, CreditCard } from 'lucide-react';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (input: { userId: string; name: string; password: string; role: 'USER' | 'ADMIN' }) => Promise<void>;
}

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({
  isOpen,
  onClose,
  onRegister,
}) => {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !name.trim() || !password) return;

    setLoading(true);
    try {
      await onRegister({
        userId: userId.trim(),
        name: name.trim(),
        password,
        role,
      });
      // Reset form
      setUserId('');
      setName('');
      setPassword('');
      setRole('USER');
      onClose();
    } catch (err) {
      console.error('Error in RegisterUserModal handleSubmit:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-950 rounded-lg text-emerald-400 border border-emerald-800/60">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Register New Employee / User</h3>
              <p className="text-xs text-slate-400">Add a new account to your company tenant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-500/10 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 text-sm font-sans outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              User ID / Username
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. alex123"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 text-sm font-sans outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 text-sm font-sans outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              System Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('USER')}
                className={`py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  role === 'USER'
                    ? 'bg-sky-950 border-sky-600 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                USER (Employee)
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  role === 'ADMIN'
                    ? 'bg-amber-950 border-amber-600 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                ADMIN
              </button>
            </div>
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
              disabled={loading || !userId.trim() || !name.trim() || !password}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Registering...' : 'Register User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
