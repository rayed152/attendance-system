import React from 'react';
import { LucideIcon, Lock } from 'lucide-react';

export interface SideNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  title?: string;
}

interface SideNavProps {
  heading?: string;
  items: SideNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Reusable sticky sidebar navigation. Renders a list of tab-style buttons,
 * with optional disabled/"locked" entries (e.g. features not yet available).
 */
export const SideNav: React.FC<SideNavProps> = ({ heading, items, activeId, onChange, className = '' }) => {
  return (
    <aside className={`w-52 shrink-0 glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 sticky top-24 ${className}`.trim()}>
      {heading && (
        <div className="px-3 py-2 border-b border-slate-800/80 mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{heading}</h3>
        </div>
      )}

      <nav className="space-y-1.5 text-xs font-semibold">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <button
                key={item.id}
                disabled
                title={item.title}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-600 bg-slate-900/30 border border-slate-900 cursor-not-allowed opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-600" />
                  <span>{item.label}</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-slate-600" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeId === item.id
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
