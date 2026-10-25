import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  QrCode,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  APP_LOGO_PATH,
  ESEWA_MERCHANT_ID,
  ESEWA_MERCHANT_NAME,
  ESEWA_QR_PATH,
  formatNpr,
  VALIDATION_LIMITS,
} from '../types';

interface LoadWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000] as const;

export const LoadWalletModal: React.FC<LoadWalletModalProps> = ({
  isOpen,
  onClose,
  onRequireAuth,
}) => {
  const { firebaseUser, userProfile, submitPendingWalletRequest } = useStore();

  const [amountInput, setAmountInput] = useState<string>('500');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [step, setStep] = useState<'form' | 'submitted'>('form');
  const [qrImgFailed, setQrImgFailed] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string>('');

  if (!isOpen) return null;

  const numericAmount = Math.round(Number(amountInput) || 0);
  const currentBalance = userProfile?.walletBalance ?? 0;

  const resetAndClose = () => {
    setStep('form');
    setErrorMsg(null);
    setPaymentRef('');
    onClose();
  };

  const handleCopyEsewaId = () => {
    navigator.clipboard?.writeText(ESEWA_MERCHANT_ID);
    setCopiedId(true);
    window.setTimeout(() => setCopiedId(false), 1800);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firebaseUser) {
      resetAndClose();
      onRequireAuth();
      return;
    }
    if (!firebaseUser.emailVerified) {
      setErrorMsg('Please verify your email address first or sign in with Google.');
      return;
    }
    if (numericAmount < VALIDATION_LIMITS.MIN_TOPUP_NPR) {
      setErrorMsg(`Minimum top-up is Rs. ${VALIDATION_LIMITS.MIN_TOPUP_NPR}.`);
      return;
    }
    if (numericAmount > VALIDATION_LIMITS.MAX_TOPUP_NPR) {
      setErrorMsg('Maximum single top-up is Rs. 1,00,000.');
      return;
    }
    if (paymentRef.trim().length < 4) {
      setErrorMsg('Please enter your eSewa Transaction Code or Sender eSewa Number.');
      return;
    }

    setSubmitting(true);
    try {
      const tx = await submitPendingWalletRequest(numericAmount, paymentRef);
      setSubmittedCode(tx.referenceCode);
      setStep('submitted');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={resetAndClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl max-h-[94vh] overflow-y-auto p-5 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            aria-label="Close wallet modal"
            onClick={resetAndClose}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Load Wallet via eSewa
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Scan the official eSewa pass and submit your payment code
            </p>
          </div>
        </div>

        {/* Current Balance Card */}
        <div className="rounded-2xl bg-indigo-50/75 border border-indigo-100 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold tracking-wider text-slate-500">
              Current balance
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {formatNpr(currentBalance)}
            </div>
            <div className="text-xs text-slate-500">Your ZX STORE wallet</div>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white shadow-2xs border border-indigo-100/80 flex items-center justify-center text-blue-700 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmitRequest} className="space-y-5">
            {/* Custom ZX STORE × eSewa Perforated Scan Pass */}
            <div className="rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl">
              {/* Pass Top Bar: Brand Identity + Official eSewa Mark */}
              <div className="px-5 pt-5 pb-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={APP_LOGO_PATH}
                    alt="ZX STORE"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-extrabold tracking-tight text-white truncate">
                      ZX STORE
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      Verified Merchant Pass
                    </div>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-[#60BB46] text-slate-950 font-extrabold text-xs tracking-tight whitespace-nowrap shrink-0 shadow-xs">
                  eSewa QR
                </div>
              </div>

              {/* Dynamic Amount to Scan Strip */}
              <div className="mx-5 px-4 py-2.5 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-300">Scan &amp; Pay Amount</span>
                <span className="text-base sm:text-lg font-extrabold text-[#60BB46] tabular-nums">
                  {numericAmount >= 10 ? formatNpr(numericAmount) : 'Rs. 0'}
                </span>
              </div>

              {/* Ticket Perforation Divider */}
              <div className="relative my-4 flex items-center" aria-hidden="true">
                <div className="w-5 h-5 rounded-full bg-white -ml-2.5 shrink-0" />
                <div className="flex-1 border-t border-dashed border-white/20 mx-2" />
                <div className="w-5 h-5 rounded-full bg-white -mr-2.5 shrink-0" />
              </div>

              {/* Precision-Framed QR Scanner Stage */}
              <div className="px-5 pb-5 flex flex-col items-center">
                <div className="relative p-3.5 rounded-3xl bg-white shadow-2xl">
                  {/* 4 Emerald Viewfinder Corner Brackets */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-[3px] border-l-[3px] border-[#60BB46] rounded-tl-lg"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-[3px] border-r-[3px] border-[#60BB46] rounded-tr-lg"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-2 left-2 w-5 h-5 border-b-[3px] border-l-[3px] border-[#60BB46] rounded-bl-lg"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-2 right-2 w-5 h-5 border-b-[3px] border-r-[3px] border-[#60BB46] rounded-br-lg"
                  />

                  <div className="relative w-48 h-48 sm:w-52 sm:h-52 overflow-hidden rounded-xl bg-white flex items-center justify-center">
                    {!qrImgFailed ? (
                      <img
                        src={ESEWA_QR_PATH}
                        alt={`${ESEWA_MERCHANT_NAME} eSewa QR (${ESEWA_MERCHANT_ID})`}
                        referrerPolicy="no-referrer"
                        onError={() => setQrImgFailed(true)}
                        className="absolute left-1/2 -translate-x-1/2 top-[-59.5%] w-[139%] max-w-none select-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-800 gap-1.5 p-3">
                        <QrCode className="w-20 h-20 text-[#60BB46]" />
                        <span className="text-xs font-bold">{ESEWA_MERCHANT_NAME}</span>
                        <span className="text-xs font-mono-num">{ESEWA_MERCHANT_ID}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Merchant Details & Quick Actions */}
                <div className="mt-4 w-full space-y-3 text-center">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-white tracking-wide">
                      {ESEWA_MERCHANT_NAME}
                    </div>
                    <div className="text-xs text-slate-300 font-mono-num">
                      eSewa Number: <span className="text-[#60BB46] font-bold">{ESEWA_MERCHANT_ID}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={handleCopyEsewaId}
                      className="min-h-[44px] px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-4 h-4 text-[#60BB46] shrink-0" />
                          <span>ID Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-300 shrink-0" />
                          <span>Copy eSewa ID</span>
                        </>
                      )}
                    </button>

                    <a
                      href={ESEWA_QR_PATH}
                      download="ZX-STORE-eSewa-QR.png"
                      className="min-h-[44px] px-3 rounded-xl bg-[#60BB46] hover:bg-[#52a63b] text-slate-950 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Save QR Image</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1: Amount Input */}
            <div className="space-y-2">
              <label
                htmlFor="wallet-topup-amount"
                className="block text-sm font-bold text-slate-900"
              >
                1. Sent Amount (NPR)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-base font-semibold text-slate-400 select-none">
                  Rs.
                </span>
                <input
                  id="wallet-topup-amount"
                  type="number"
                  min={10}
                  max={100000}
                  step={1}
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="Enter amount sent"
                  className="w-full h-13 pl-13 pr-4 rounded-2xl bg-white border border-slate-200 text-base font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
              <p className="text-xs text-slate-500">
                Minimum top-up is Rs. {VALIDATION_LIMITS.MIN_TOPUP_NPR}
              </p>
            </div>

            {/* Quick Amount Selector Buttons: 500, 1,000, 2,000, 5,000 */}
            <div className="grid grid-cols-4 gap-2.5">
              {QUICK_AMOUNTS.map((amt) => {
                const selected = numericAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountInput(String(amt))}
                    className={`h-11 rounded-xl border text-sm font-bold tabular-nums transition-colors cursor-pointer ${
                      selected
                        ? 'border-blue-700 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {amt.toLocaleString('en-IN')}
                  </button>
                );
              })}
            </div>

            {/* Step 2: eSewa Transaction Code / Sender Phone */}
            <div className="space-y-2">
              <label
                htmlFor="wallet-esewa-ref"
                className="block text-sm font-bold text-slate-900"
              >
                2. eSewa Transaction Code or Sender eSewa Number
              </label>
              <input
                id="wallet-esewa-ref"
                type="text"
                required
                minLength={4}
                maxLength={120}
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. 0PG84K2 or 98XXXXXXXX"
                className="w-full h-13 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Submit Pending Request Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-13 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-colors shadow-sm cursor-pointer"
            >
              <span>
                {submitting
                  ? 'Submitting Request...'
                  : `Submit eSewa Request (${numericAmount >= 10 ? formatNpr(numericAmount) : 'Rs. 0'})`}
              </span>
            </button>

            {/* Manual Admin Verification Notice */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Complete your transfer on eSewa first, then submit your Transaction Code above. Your
                ZX STORE wallet balance will be credited after Admin verifies the payment.
              </p>
            </div>
          </form>
        )}

        {step === 'submitted' && (
          <div className="py-4 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900">
                Payment Verification Pending
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your eSewa top-up request{' '}
                <strong className="font-mono-num text-slate-900">{submittedCode}</strong> for{' '}
                <strong className="text-slate-900 tabular-nums">{formatNpr(numericAmount)}</strong>{' '}
                has been sent to Admin. Funds will appear in your wallet as soon as your payment is
                approved.
              </p>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
