import React, { useState, useEffect } from 'react';
import { X, UserPen, User, Lock, Shield } from 'lucide-react';

interface UserItem {
  id: string;
  userId: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isBlocked?: boolean;
}

interface EditUserModalProps {
  user: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: { userId: string; name?: string; role?: 'USER' | 'ADMIN'; newPassword?: string }) => Promise<void>;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setNewPassword('');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        userId: user.userId,
        name: name.trim(),
        role,
        newPassword: newPassword.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error saving user edits:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-950 rounded-lg text-sky-400 border border-sky-800/60">
              <UserPen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit User Information</h3>
              <p className="text-xs text-slate-400">User ID: {user.userId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 outline-none focus:border-sky-500 font-sans text-sm"
              required
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-300 mb-1">System Role</label>
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
                USER
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

          <div>
            <label className="block font-semibold uppercase text-slate-300 mb-1">Reset Password (Optional)</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 outline-none focus:border-sky-500 font-sans"
              />
            </div>
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
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-sky-600/20"
            >
              <UserPen className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save User Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
