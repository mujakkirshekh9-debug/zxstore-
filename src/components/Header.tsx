import React, { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ActiveTab, APP_LOGO_PATH, formatNpr } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate, onOpenWallet }) => {
  const { firebaseUser, userProfile, isAdmin } = useStore();
  const [logoFailed, setLogoFailed] = useState(false);

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'orders', label: 'Orders' },
    { id: 'smm', label: 'SMM' },
    { id: 'profile', label: 'Profile' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin' });
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo & Single-Line Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate(isAdmin ? 'admin' : 'home')}
          className="inline-flex items-center gap-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 rounded-lg"
        >
          {!logoFailed ? (
            <img
              src={APP_LOGO_PATH}
              alt="ZX STORE Logo"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-slate-200/80 shadow-2xs shrink-0"
            />
          ) : (
            <span className="w-9 h-9 rounded-xl bg-slate-950 text-sky-400 text-xs font-black flex items-center justify-center shrink-0">
              ZX
            </span>
          )}
          <span>
            <span className="text-blue-700">ZX</span> STORE
          </span>
        </button>

        {/* Zone 2: Desktop Single-Line Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
                  isActive
                    ? 'text-blue-700 border-blue-700'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Contextual Action */}
        <div className="flex items-center shrink-0">
          {firebaseUser ? (
            <button
              type="button"
              onClick={onOpenWallet}
              aria-label="Wallet balance and eSewa top-up"
              className="h-10 pl-3.5 pr-1.5 rounded-full border border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 transition-colors flex items-center gap-2.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wallet className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {formatNpr(userProfile?.walletBalance ?? 0)}
              </span>
              <span className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="h-10 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
