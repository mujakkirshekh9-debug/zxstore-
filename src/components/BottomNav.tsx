import React from 'react';
import { Home, Megaphone, ReceiptText, User } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onNavigate }) => {
  const tabs: { id: ActiveTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'orders', label: 'Orders', Icon: ReceiptText },
    { id: 'smm', label: 'SMM', Icon: Megaphone },
    { id: 'profile', label: 'Profile', Icon: User },
  ];

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ id, label, Icon }) => {
          const isActive =
            activeTab === id || (id === 'profile' && (activeTab === 'auth' || activeTab === 'admin'));
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 rounded-xl"
            >
              <span
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span
                className={`text-[11px] font-semibold tracking-tight whitespace-nowrap ${
                  isActive ? 'text-blue-700' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
