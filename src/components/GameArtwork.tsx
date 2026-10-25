import React, { useEffect, useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { GAME_LOGO_PATHS } from '../types';

interface ArtworkProps {
  artworkKey: string;
  className?: string;
}

/**
 * Renders official uploaded game logos for Free Fire, PUBG Mobile, Mobile Legends,
 * and Blood Strike with automatic fallback protection, plus clean vector icons for
 * Telegram and SMM services.
 */
export const GameArtwork: React.FC<ArtworkProps> = ({ artworkKey, className = 'w-full h-full' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [artworkKey]);

  switch (artworkKey) {
    case 'pubg':
      return (
        <div
          className={`${className} relative overflow-hidden bg-neutral-950 flex items-center justify-center select-none`}
        >
          {!imgFailed ? (
            <img
              src={GAME_LOGO_PATHS.pubg}
              alt="PUBG Mobile"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover scale-[1.16]"
            />
          ) : (
            <span className="text-xs font-black tracking-wider text-white">PUBG</span>
          )}
        </div>
      );

    case 'mlbb':
      return (
        <div
          className={`${className} relative overflow-hidden bg-neutral-950 flex items-center justify-center select-none`}
        >
          {!imgFailed ? (
            <img
              src={GAME_LOGO_PATHS.mlbb}
              alt="Mobile Legends: Bang Bang"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover scale-[1.18]"
            />
          ) : (
            <span className="text-xs font-black tracking-wider text-amber-400">MLBB</span>
          )}
        </div>
      );

    case 'freefire_np':
      return (
        <div
          className={`${className} relative overflow-hidden bg-white flex items-center justify-center p-1 select-none`}
        >
          {!imgFailed ? (
            <img
              src={GAME_LOGO_PATHS.freefire}
              alt="Garena Free Fire BD/NP"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain brightness-[1.06] contrast-[1.09]"
            />
          ) : (
            <span className="text-xs font-black tracking-tighter text-red-600">FF</span>
          )}
        </div>
      );

    case 'freefire_id':
      return (
        <div
          className={`${className} relative overflow-hidden bg-white flex items-center justify-center p-1 select-none`}
        >
          {!imgFailed ? (
            <img
              src={GAME_LOGO_PATHS.freefire}
              alt="Garena Free Fire Indonesia"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain brightness-[1.06] contrast-[1.09]"
            />
          ) : (
            <span className="text-xs font-black tracking-tighter text-red-600">FF ID</span>
          )}
          <div className="absolute bottom-0 right-0 z-10 bg-red-600 text-white rounded-tl-lg px-1.5 py-0.5 shadow-2xs">
            <span className="text-[9px] font-black tracking-tight leading-none block">ID</span>
          </div>
        </div>
      );

    case 'bloodstrike':
      return (
        <div
          className={`${className} relative overflow-hidden bg-black flex items-center justify-center select-none`}
        >
          {!imgFailed ? (
            <img
              src={GAME_LOGO_PATHS.bloodstrike}
              alt="Blood Strike"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-black tracking-tight text-red-600">BS</span>
          )}
        </div>
      );

    case 'telegram':
    case 'smm_tg':
      return (
        <div className={`${className} bg-white border border-slate-100 flex items-center justify-center p-2 select-none`}>
          <div className="w-full h-full rounded-full bg-gradient-to-b from-sky-400 to-sky-600 flex items-center justify-center text-white shadow-inner">
            <Send className="w-1/2 h-1/2 -ml-0.5 translate-y-[1px]" strokeWidth={2.3} />
          </div>
        </div>
      );

    case 'smm_ig':
      return (
        <div className={`${className} bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-700 flex items-center justify-center text-white select-none`}>
          <span className="text-lg font-extrabold tracking-tight">IG</span>
        </div>
      );

    case 'smm_fb':
      return (
        <div className={`${className} bg-blue-600 flex items-center justify-center text-white select-none`}>
          <span className="text-xl font-extrabold">f</span>
        </div>
      );

    case 'smm_yt':
      return (
        <div className={`${className} bg-red-600 flex items-center justify-center text-white select-none`}>
          <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-white border-b-[7px] border-b-transparent ml-1" />
        </div>
      );

    case 'smm_tt':
      return (
        <div className={`${className} bg-slate-950 flex items-center justify-center text-white select-none`}>
          <span className="text-lg font-extrabold tracking-tight text-cyan-300">TT</span>
        </div>
      );

    default:
      return (
        <div className={`${className} bg-blue-700 flex items-center justify-center text-white select-none`}>
          <Megaphone className="w-1/2 h-1/2" strokeWidth={2.1} />
        </div>
      );
  }
};

/**
 * Renders the package icon shown inside game top-up cards (Diamonds, Weekly Card,
 * Monthly Gold Card, Level Up Pass, or UC Crate).
 */
export const PackageIconBadge: React.FC<{ label: string }> = ({ label }) => {
  const lower = label.toLowerCase();

  if (lower.includes('monthly')) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 border border-amber-200 flex items-center justify-center shadow-2xs shrink-0 select-none">
        <span className="text-xs font-black text-amber-950">M</span>
      </div>
    );
  }

  if (lower.includes('weekly')) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700 border border-purple-300/60 flex items-center justify-center shadow-2xs shrink-0 select-none">
        <span className="text-xs font-black text-amber-200">W</span>
      </div>
    );
  }

  if (lower.includes('level up') || lower.includes('pass')) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 border border-amber-200 flex items-center justify-center shadow-2xs shrink-0 select-none">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.9 6.1 6.7.9-4.8 4.7 1.2 6.7L12 17.2 6 20.4l1.2-6.7L2.4 9l6.7-.9L12 2z" />
        </svg>
      </div>
    );
  }

  if (lower.includes('uc') || lower.includes('gold')) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 border border-amber-200 flex items-center justify-center shadow-2xs shrink-0 select-none">
        <span className="text-[10px] font-black text-slate-950">UC</span>
      </div>
    );
  }

  // Default Crystal Blue Diamond Icon (matching Free Fire screenshots)
  return (
    <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 select-none">
      <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true">
        <polygon points="16,3 28,11 16,29 4,11" fill="#0ea5e9" />
        <polygon points="16,3 28,11 16,14" fill="#7dd3fc" />
        <polygon points="16,3 4,11 16,14" fill="#38bdf8" />
        <polygon points="10,11 22,11 16,29" fill="#0284c7" />
      </svg>
    </div>
  );
};

export interface PromoSlide {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  action: 'games' | 'wallet' | 'smm';
  theme: 'airdrop' | 'diamonds' | 'smm';
}

export const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'slide-airdrop',
    kicker: 'Instant UID Delivery · Nepal',
    title: 'Free Fire BD/NP, PUBG UC & MLBB Diamonds',
    subtitle: 'Select your diamond or membership pack, enter your Game ID, and pay from your ZX STORE wallet.',
    ctaLabel: 'Browse Games',
    action: 'games',
    theme: 'airdrop',
  },
  {
    id: 'slide-wallet',
    kicker: 'Official eSewa QR Wallet Load',
    title: 'Scan eSewa QR to Load Your ZX STORE Wallet',
    subtitle: 'Transfer from Rs. 10 upwards via our official eSewa QR and submit your transaction code for verification.',
    ctaLabel: 'Load Wallet',
    action: 'wallet',
    theme: 'diamonds',
  },
  {
    id: 'slide-smm',
    kicker: 'ZX Creator Growth Panel',
    title: 'Social Followers, Likes & Views Starting at Rs. 29',
    subtitle: 'Boost Instagram, TikTok, YouTube, Facebook, and Telegram with live order tracking.',
    ctaLabel: 'Open SMM Panel',
    action: 'smm',
    theme: 'smm',
  },
];

export const PromoBannerIllustration: React.FC<{ theme: PromoSlide['theme'] }> = ({ theme }) => {
  if (theme === 'airdrop') {
    return (
      <svg viewBox="0 0 420 200" className="w-full h-full object-cover" aria-hidden="true">
        <defs>
          <linearGradient id="duskBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="55%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
          <radialGradient id="sunBurst" cx="76%" cy="32%" r="48%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#ea580c" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="420" height="200" fill="url(#duskBg)" />
        <rect width="420" height="200" fill="url(#sunBurst)" />
        <path d="M275 34 C295 2, 355 2, 375 34 Z" fill="#f59e0b" />
        <line x1="282" y1="34" x2="312" y2="88" stroke="#fde68a" strokeWidth="1.4" />
        <line x1="325" y1="34" x2="325" y2="88" stroke="#fde68a" strokeWidth="1.4" />
        <line x1="368" y1="34" x2="338" y2="88" stroke="#fde68a" strokeWidth="1.4" />
        <rect x="300" y="88" width="50" height="42" rx="5" fill="#d97706" stroke="#fef08a" strokeWidth="2" />
        <rect x="300" y="103" width="50" height="10" fill="#78350f" />
        <circle cx="325" cy="108" r="6" fill="#fef08a" />
        <circle cx="282" cy="122" r="4" fill="#fde047" />
        <circle cx="364" cy="102" r="5" fill="#facc15" />
        <circle cx="358" cy="138" r="3.5" fill="#fde047" />
      </svg>
    );
  }

  if (theme === 'diamonds') {
    return (
      <svg viewBox="0 0 420 200" className="w-full h-full object-cover" aria-hidden="true">
        <defs>
          <linearGradient id="crystalBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#070d26" />
            <stop offset="55%" stopColor="#172554" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <rect width="420" height="200" fill="url(#crystalBg)" />
        <circle cx="330" cy="100" r="78" fill="#38bdf8" fillOpacity="0.18" />
        <polygon points="325,36 368,78 325,156 282,78" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="2" />
        <polygon points="325,36 368,78 325,95" fill="#bae6fd" fillOpacity="0.7" />
        <polygon points="274,96 298,118 274,158 250,118" fill="#818cf8" stroke="#e0e7ff" strokeWidth="1.5" />
        <polygon points="374,88 394,108 374,144 354,108" fill="#60a5fa" stroke="#dbeafe" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 420 200" className="w-full h-full object-cover" aria-hidden="true">
      <defs>
        <linearGradient id="smmBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="60%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="420" height="200" fill="url(#smmBg)" />
      <rect x="270" y="42" width="118" height="116" rx="18" fill="#ffffff" fillOpacity="0.1" stroke="#93c5fd" strokeOpacity="0.35" />
      <polyline points="288,128 314,104 334,114 368,72" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="368" cy="72" r="5" fill="#bae6fd" />
    </svg>
  );
};
