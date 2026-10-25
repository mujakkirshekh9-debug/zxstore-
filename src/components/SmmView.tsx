import React, { useMemo, useState } from 'react';
import { Eye, Heart, Megaphone, Send, UserPlus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ActiveTab, formatNpr, Product, SmmPlatform, TopUpPackage } from '../types';

interface SmmViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onSelectSmmProduct: (product: Product) => void;
}

const PLATFORMS: { id: SmmPlatform; label: string }[] = [
  { id: 'Instagram', label: 'Instagram' },
  { id: 'Facebook', label: 'Facebook' },
  { id: 'YouTube', label: 'YouTube' },
  { id: 'TikTok', label: 'TikTok' },
  { id: 'Telegram', label: 'Telegram' },
];

export const SmmView: React.FC<SmmViewProps> = ({ onNavigate, onSelectSmmProduct }) => {
  const { products, packages } = useStore();
  const [selectedPlatform, setSelectedPlatform] = useState<SmmPlatform>('Instagram');
  const [selectedType, setSelectedType] = useState<'All' | 'Followers' | 'Likes' | 'Views'>('All');

  const smmProducts = useMemo(
    () => products.filter((p) => p.category === 'smm' && p.active),
    [products]
  );

  const currentPlatformProduct = useMemo(
    () => smmProducts.find((p) => p.smmPlatform === selectedPlatform) || smmProducts[0] || null,
    [smmProducts, selectedPlatform]
  );

  const matchingPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (!pkg.active) return false;
      const parent = smmProducts.find((p) => p.id === pkg.productId);
      if (!parent) return false;
      if (parent.smmPlatform !== selectedPlatform) return false;
      if (selectedType !== 'All' && pkg.serviceType !== selectedType) return false;
      return true;
    });
  }, [packages, smmProducts, selectedPlatform, selectedType]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Main SMM Panel Hero Card matching reference screenshot */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-700 text-white flex items-center justify-center">
          <Megaphone className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-blue-700">Live Instant Panel &middot; NPR Wallet</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            SMM Panel
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Followers, likes and views for your social accounts. NPR pricing, delivery tracked in
            your orders.
          </p>
        </div>

        {/* Interactive Social Platform Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {PLATFORMS.map((plat) => {
            const active = selectedPlatform === plat.id;
            return (
              <button
                key={plat.id}
                type="button"
                onClick={() => setSelectedPlatform(plat.id)}
                className={`h-10 px-4 rounded-full border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300'
                }`}
              >
                {plat.id === 'Telegram' && <Send className="w-3.5 h-3.5" />}
                <span>{plat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3 Category Filter Cards: Followers, Likes, Views */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {(
          [
            { id: 'Followers', label: 'Followers', priceText: 'from Rs. 99', Icon: UserPlus },
            { id: 'Likes', label: 'Likes', priceText: 'from Rs. 49', Icon: Heart },
            { id: 'Views', label: 'Views', priceText: 'from Rs. 29', Icon: Eye },
          ] as const
        ).map(({ id, label, priceText, Icon }) => {
          const isSelected = selectedType === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedType((prev) => (prev === id ? 'All' : id))}
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-700 bg-blue-50/60 ring-1 ring-blue-700'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Icon className="w-6 h-6 text-blue-700 mb-1" />
              <span className="text-sm sm:text-base font-bold text-slate-900">{label}</span>
              <span className="text-xs text-slate-500 tabular-nums">{priceText}</span>
            </button>
          );
        })}
      </section>

      {/* Active Platform Services List */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {selectedPlatform} {selectedType === 'All' ? 'Packages' : selectedType}
            </h2>
            <p className="text-xs text-slate-500">
              Click any service below to enter your public profile or post URL and order.
            </p>
          </div>
          {selectedType !== 'All' && (
            <button
              type="button"
              onClick={() => setSelectedType('All')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
            >
              Show all
            </button>
          )}
        </div>

        {matchingPackages.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 text-center text-sm text-slate-500">
            No {selectedType.toLowerCase()} packages currently listed for {selectedPlatform}.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {matchingPackages.map((pkg: TopUpPackage) => {
              const parentProduct =
                smmProducts.find((p) => p.id === pkg.productId) || currentPlatformProduct;
              return (
                <div
                  key={pkg.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-bold text-slate-900 truncate">{pkg.name}</div>
                    <div className="text-xs text-slate-500">
                      {pkg.amountLabel}
                      {pkg.bonusLabel ? ` · ${pkg.bonusLabel}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                      {formatNpr(pkg.priceNpr)}
                    </span>
                    {parentProduct && (
                      <button
                        type="button"
                        onClick={() => onSelectSmmProduct(parentProduct)}
                        className="h-9 px-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Back to Games Button matching screenshot */}
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="w-full h-13 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-900 transition-colors cursor-pointer"
      >
        Back to games
      </button>
    </div>
  );
};
