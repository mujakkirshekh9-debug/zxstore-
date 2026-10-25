import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Minus, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatNpr, Order, Product, TopUpPackage } from '../types';
import { GameArtwork, PackageIconBadge } from './GameArtwork';

interface ProductPurchaseModalProps {
  product: Product | null;
  onClose: () => void;
  onRequireAuth: () => void;
  onOpenWallet: () => void;
  onGoToOrders: () => void;
}

export const ProductPurchaseModal: React.FC<ProductPurchaseModalProps> = ({
  product,
  onClose,
  onRequireAuth,
  onOpenWallet,
  onGoToOrders,
}) => {
  const { packages, firebaseUser, userProfile, purchasePackage } = useStore();

  const productPackages = useMemo(() => {
    if (!product) return [];
    return packages
      .filter((p) => p.productId === product.id && p.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [packages, product]);

  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [targetAccount, setTargetAccount] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uidMissing, setUidMissing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const playerIdInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (productPackages.length > 0) {
      setSelectedPkgId(productPackages[0].id);
    } else {
      setSelectedPkgId('');
    }
    setTargetAccount('');
    setQuantity(1);
    setErrorMsg(null);
    setUidMissing(false);
    setCompletedOrder(null);
  }, [product?.id]);

  useEffect(() => {
    if (!selectedPkgId && productPackages.length > 0) {
      setSelectedPkgId(productPackages[0].id);
    }
  }, [productPackages, selectedPkgId]);

  if (!product) return null;

  const selectedPkg: TopUpPackage | undefined = productPackages.find(
    (p) => p.id === selectedPkgId
  );
  const totalPrice = selectedPkg ? Math.round(selectedPkg.priceNpr * quantity) : 0;
  const walletBalance = userProfile?.walletBalance ?? 0;
  const shortfall = Math.max(0, totalPrice - walletBalance);

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firebaseUser) {
      onClose();
      onRequireAuth();
      return;
    }
    if (!firebaseUser.emailVerified) {
      setErrorMsg(
        'Please verify your email address in Profile before placing an order, or sign in with Google.'
      );
      return;
    }
    if (!selectedPkg) {
      setErrorMsg('Please select a top-up package.');
      return;
    }
    if (targetAccount.trim().length < 2) {
      setUidMissing(true);
      setErrorMsg(`Step 1: Please enter your ${product.inputLabel} (UID) above before buying.`);
      playerIdInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        playerIdInputRef.current?.focus();
      }, 220);
      return;
    }
    if (shortfall > 0) {
      onClose();
      onOpenWallet();
      return;
    }

    setSubmitting(true);
    try {
      const created = await purchasePackage({
        product,
        pkg: selectedPkg,
        targetAccount,
        quantity,
      });
      setCompletedOrder(created);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Unable to place order.';
      if (raw.startsWith('{')) {
        try {
          const parsed = JSON.parse(raw) as { error?: string };
          setErrorMsg(parsed.error || 'Unable to process order right now. Please try again.');
        } catch {
          setErrorMsg('Unable to process order right now. Please try again.');
        }
      } else {
        setErrorMsg(raw);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sheet Bar */}
        <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to store"
              className="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shrink-0">
              <GameArtwork artworkKey={product.artworkKey} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {product.name}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">{product.publisher}</p>
            </div>
          </div>

          {firebaseUser && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWallet();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-xs text-slate-700 transition-colors shrink-0 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-blue-700" />
              <strong className="font-bold text-slate-900 tabular-nums">
                {formatNpr(walletBalance)}
              </strong>
            </button>
          )}
        </div>

        {completedOrder ? (
          <div className="p-6 sm:p-8 bg-white space-y-6 text-center max-w-md mx-auto w-full my-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-slate-900">Order Placed</h3>
              <p className="text-sm text-slate-600">
                Your order{' '}
                <span className="font-mono-num font-semibold text-slate-900">
                  #{completedOrder.orderCode}
                </span>{' '}
                has been submitted for UID delivery.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Product</span>
                <span className="font-semibold text-slate-900">{completedOrder.productName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Package</span>
                <span className="font-semibold text-slate-900">
                  {completedOrder.packageName} &times; {completedOrder.quantity}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">{product.inputLabel}</span>
                <span className="font-mono-num font-semibold text-slate-900 break-all">
                  {completedOrder.targetAccount}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between gap-4">
                <span className="text-slate-600 font-medium">Paid from Wallet</span>
                <span className="font-bold text-blue-700 tabular-nums">
                  {formatNpr(completedOrder.priceNpr)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToOrders();
                }}
                className="flex-1 h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Track in My Orders
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmPurchase} className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Step 1: Game ID Card (matching reference screenshot) */}
              <div
                className={`bg-white border rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs transition-colors ${
                  uidMissing ? 'border-red-500 ring-2 ring-red-500/15' : 'border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-full text-white text-xs font-extrabold flex items-center justify-center shrink-0 ${
                        uidMissing ? 'bg-red-600' : 'bg-blue-700'
                      }`}
                    >
                      1
                    </span>
                    <label
                      htmlFor="player-id-input"
                      className="text-base font-extrabold text-slate-900"
                    >
                      {product.inputLabel}
                    </label>
                  </div>
                  {uidMissing && (
                    <span className="text-xs font-bold text-red-600">Required</span>
                  )}
                </div>

                <input
                  ref={playerIdInputRef}
                  id="player-id-input"
                  type="text"
                  maxLength={200}
                  value={targetAccount}
                  onChange={(e) => {
                    setTargetAccount(e.target.value);
                    if (uidMissing && e.target.value.trim().length >= 2) {
                      setUidMissing(false);
                      setErrorMsg(null);
                    }
                  }}
                  placeholder={product.inputPlaceholder}
                  className={`w-full h-12 px-4 rounded-xl border text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:outline-none transition-colors ${
                    uidMissing
                      ? 'bg-red-50/40 border-red-400 focus:border-red-600'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* Step 2: Select Top-Up Grid (2-column cards with icon + radio + NPR price) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="text-base font-extrabold text-slate-900">Select Top-up</span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {productPackages.length} items
                  </span>
                </div>

                {productPackages.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">
                    No active packages configured for this title yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                    {productPackages.map((pkg) => {
                      const isSelected = pkg.id === selectedPkgId;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPkgId(pkg.id)}
                          className={`relative p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 min-h-[104px] ${
                            isSelected
                              ? 'border-blue-700 bg-blue-50/45 ring-1 ring-blue-700'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {/* Top Row: Package Icon + Selection Radio */}
                          <div className="flex items-start justify-between gap-2 w-full">
                            {product.category === 'smm' ? (
                              <span className="text-xs font-bold text-blue-700">
                                {pkg.serviceType}
                              </span>
                            ) : (
                              <PackageIconBadge label={pkg.amountLabel} />
                            )}

                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'border-blue-700 bg-blue-700 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                            </span>
                          </div>

                          {/* Bottom Row: Amount Title + NPR Price */}
                          <div className="space-y-0.5 w-full">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                              {pkg.amountLabel}
                            </div>
                            <div className="text-xs sm:text-sm font-extrabold text-blue-700 tabular-nums">
                              {formatNpr(pkg.priceNpr)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quantity Selector */}
                {selectedPkg && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-slate-600">
                      Quantity:{' '}
                      <strong className="text-slate-900">{selectedPkg.amountLabel}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-slate-900 tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                        className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Paid securely from your ZX STORE wallet with live order tracking in My Orders.
                </span>
              </div>
            </div>

            {/* Sticky Bottom Buy Now Bar with Pinned Alert Banner */}
            {selectedPkg && (
              <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3.5 space-y-2.5 shrink-0">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 truncate">
                      {selectedPkg.amountLabel}
                      {quantity > 1 ? ` × ${quantity}` : ''}
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
                      {formatNpr(totalPrice)}
                    </div>
                  </div>

                  {!firebaseUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequireAuth();
                      }}
                      className="h-12 px-6 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Log in to Buy
                    </button>
                  ) : shortfall > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenWallet();
                      }}
                      className="h-12 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Load Wallet (+{formatNpr(shortfall)})
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-12 px-8 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {submitting ? 'Processing...' : 'Buy Now'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
