import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Megaphone, Search, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ActiveTab, APP_LOGO_PATH, formatNpr, Product } from '../types';
import { GameArtwork, PROMO_SLIDES, PromoBannerIllustration } from './GameArtwork';

interface HomeViewProps {
  onSelectProduct: (product: Product) => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenWallet: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectProduct,
  onNavigate,
  onOpenWallet,
}) => {
  const { products, packages } = useStore();
  const [slideIndex, setSlideIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'game' | 'digital'>('all');
  const [infoModal, setInfoModal] = useState<'about' | 'terms' | 'privacy' | null>(null);
  const [footerLogoFailed, setFooterLogoFailed] = useState(false);

  const gamesSectionRef = useRef<HTMLDivElement | null>(null);

  // Auto-advance promotional carousel every 6s
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  // Storefront games & digital items
  const storefrontItems = useMemo(() => {
    return products.filter((p) => {
      if (p.category === 'smm') return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.publisher.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, categoryFilter, searchQuery]);

  // Starting price lookup per product
  const minPriceByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pkg of packages) {
      if (!pkg.active) continue;
      if (map[pkg.productId] === undefined || pkg.priceNpr < map[pkg.productId]) {
        map[pkg.productId] = pkg.priceNpr;
      }
    }
    return map;
  }, [packages]);

  const currentSlide = PROMO_SLIDES[slideIndex];

  const handleBannerAction = (action: 'games' | 'wallet' | 'smm') => {
    if (action === 'wallet') {
      onOpenWallet();
    } else if (action === 'smm') {
      onNavigate('smm');
    } else {
      gamesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-7">
      {/* Promotional Banner Carousel */}
      <section aria-label="Promotional highlights" className="space-y-3">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 h-44 sm:h-60 md:h-68 border border-slate-200/60 shadow-xs">
          <PromoBannerIllustration theme={currentSlide.theme} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/70 to-transparent" />

          <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-8 max-w-xl">
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-xs font-medium text-sky-300 tracking-wide">
                {currentSlide.kicker}
              </p>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug text-balance">
                {currentSlide.title}
              </h1>
              <p className="hidden sm:block text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                {currentSlide.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleBannerAction(currentSlide.action)}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {currentSlide.ctaLabel}
              </button>
            </div>
          </div>

          {/* Desktop Carousel Arrows */}
          <div className="hidden sm:flex items-center gap-2 absolute bottom-5 right-6 z-10">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() =>
                setSlideIndex((prev) => (prev - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length)
              }
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setSlideIndex((prev) => (prev + 1) % PROMO_SLIDES.length)}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Indicator Bars */}
        <div className="flex items-center justify-center gap-2">
          {PROMO_SLIDES.map((s, idx) => {
            const active = idx === slideIndex;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => setSlideIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  active ? 'w-7 bg-blue-700' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            );
          })}
        </div>
      </section>

      {/* Search Bar & Filter Bar */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games"
            aria-label="Search games"
            className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          {(
            [
              { id: 'all', label: 'All Items' },
              { id: 'game', label: 'Games' },
              { id: 'digital', label: 'Digital' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Popular Games & Services Grid */}
      <section ref={gamesSectionRef} className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Games</h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {storefrontItems.length + (categoryFilter === 'all' && !searchQuery ? 1 : 0)} available
          </span>
        </div>

        {storefrontItems.length === 0 && searchQuery ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              No games matched &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-slate-500">
              Try searching for Free Fire, PUBG Mobile, Mobile Legends, Blood Strike, or Telegram.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-6">
            {storefrontItems.map((product) => {
              const startPrice = minPriceByProduct[product.id];
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="group flex flex-col items-center text-center focus-visible:outline-2 focus-visible:outline-blue-700 rounded-2xl cursor-pointer"
                >
                  <div className="w-full aspect-square rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs group-hover:-translate-y-0.5 group-hover:shadow-md transition-all duration-150">
                    <GameArtwork artworkKey={product.artworkKey} />
                  </div>
                  <span className="mt-2 text-xs sm:text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
                    {product.name}
                  </span>
                  {startPrice !== undefined && (
                    <span className="hidden sm:inline-block mt-0.5 text-[11px] text-slate-500 tabular-nums">
                      from {formatNpr(startPrice)}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Dedicated SMM Panel Tile */}
            {categoryFilter === 'all' &&
              (!searchQuery || 'smm panel social instagram tiktok'.includes(searchQuery.toLowerCase())) && (
                <button
                  type="button"
                  onClick={() => onNavigate('smm')}
                  className="group flex flex-col items-center text-center focus-visible:outline-2 focus-visible:outline-blue-700 rounded-2xl cursor-pointer"
                >
                  <div className="w-full aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-blue-700 hover:bg-blue-800 shadow-sm shadow-blue-700/20 group-hover:-translate-y-0.5 group-hover:shadow-md transition-all duration-150 flex items-center justify-center text-white">
                    <Megaphone className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2} />
                  </div>
                  <span className="mt-2 text-xs sm:text-sm font-semibold text-blue-700 leading-tight">
                    SMM Panel
                  </span>
                  <span className="hidden sm:inline-block mt-0.5 text-[11px] text-slate-500 tabular-nums">
                    from Rs. 29
                  </span>
                </button>
              )}
          </div>
        )}
      </section>

      {/* Clean Storefront Footer */}
      <footer className="pt-8 mt-8 border-t border-slate-200/80 text-slate-600 space-y-5">
        <div className="flex items-center gap-3">
          {!footerLogoFailed && (
            <img
              src={APP_LOGO_PATH}
              alt="ZX STORE"
              referrerPolicy="no-referrer"
              onError={() => setFooterLogoFailed(true)}
              className="w-11 h-11 rounded-2xl object-cover border border-slate-200/80 shrink-0"
            />
          )}
          <div className="space-y-0.5">
            <div className="text-lg font-extrabold tracking-tight text-slate-900">
              <span className="text-blue-700">ZX</span> STORE
            </div>
            <p className="text-sm text-slate-500">
              Game top-ups in Nepal. Load via eSewa QR, pay from your wallet.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <button
            type="button"
            onClick={() => setInfoModal('about')}
            className="font-medium text-slate-700 hover:text-blue-700 transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => setInfoModal('terms')}
            className="font-medium text-slate-700 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Terms
          </button>
          <button
            type="button"
            onClick={() => setInfoModal('privacy')}
            className="font-medium text-slate-700 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <a
            href="mailto:support@zxstore.com"
            className="text-slate-500 hover:text-blue-700 transition-colors"
          >
            support@zxstore.com
          </a>
        </div>

        <div className="pt-4 border-t border-slate-200/60 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} ZX STORE. All rights reserved.
        </div>
      </footer>

      {/* Info Modal for About / Terms / Privacy */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {infoModal === 'about'
                  ? 'About ZX STORE'
                  : infoModal === 'terms'
                    ? 'Terms of Service'
                    : 'Privacy Policy'}
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setInfoModal(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {infoModal === 'about' &&
                'ZX STORE is Nepal’s digital game top-up and creator SMM storefront. Load NPR funds via our official eSewa QR and check out using only your Game ID.'}
              {infoModal === 'terms' &&
                'All digital top-ups are delivered directly to the Game ID or public URL submitted at checkout. Wallet top-ups via eSewa QR are credited after payment verification.'}
              {infoModal === 'privacy' &&
                'Your email, phone number, and wallet ledger are strictly isolated using Zero-Trust Firestore security rules. Only you and the store administrator can view your account orders.'}
            </p>
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="w-full h-10 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
