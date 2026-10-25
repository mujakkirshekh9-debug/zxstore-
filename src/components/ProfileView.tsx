import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  LogOut,
  MailCheck,
  Plus,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ActiveTab, APP_LOGO_PATH, formatNpr, formatTimestamp } from '../types';

interface ProfileViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenWallet: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate, onOpenWallet }) => {
  const {
    firebaseUser,
    userProfile,
    isAdmin,
    userOrders,
    userTransactions,
    logout,
    saveProfileChanges,
    resendVerification,
    refreshAuthUser,
  } = useStore();

  const [subTab, setSubTab] = useState<'account' | 'orders' | 'wallet' | 'support'>('account');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName);
      setPhone(userProfile.phone);
    } else if (firebaseUser) {
      setFullName(firebaseUser.displayName || '');
    }
  }, [userProfile, firebaseUser]);

  if (!firebaseUser) {
    return (
      <div className="max-w-md mx-auto py-6 text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-4">
        {!logoFailed ? (
          <img
            src={APP_LOGO_PATH}
            alt="ZX STORE"
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200 mx-auto"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-blue-700 text-white text-xl font-extrabold flex items-center justify-center mx-auto">
            ZX
          </div>
        )}
        <h1 className="text-xl font-extrabold text-slate-900">Your ZX STORE Account</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Sign in or create an account to load your wallet via eSewa QR, view member details, and
          track game top-ups.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          Log in / Sign up
        </button>
      </div>
    );
  }

  const displayName =
    userProfile?.fullName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member';
  const displayEmail = userProfile?.email || firebaseUser.email || '';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const isPhoneLocked = Boolean(userProfile && userProfile.phone.length > 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      await saveProfileChanges(fullName, phone);
      setFeedback({ type: 'ok', text: 'Profile changes saved.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top User Identity Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-blue-700 text-white text-xl font-extrabold flex items-center justify-center shrink-0">
            {avatarInitial}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-slate-900 truncate">{displayName}</h1>
            <p className="text-sm text-slate-500 truncate">{displayEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="h-10 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              onNavigate('home');
            }}
            className="h-10 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Email Verification Notice if registered via Email/Password and not yet verified */}
      {!firebaseUser.emailVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <MailCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900">
              <strong className="font-semibold">Verify your email address</strong> to activate
              wallet loads and purchases. Check your inbox for the verification link.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                await resendVerification();
                setFeedback({ type: 'ok', text: 'Verification email sent.' });
              }}
              className="h-9 px-3 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-900 cursor-pointer"
            >
              Resend Link
            </button>
            <button
              type="button"
              onClick={refreshAuthUser}
              className="h-9 px-3 rounded-lg bg-amber-700 text-white text-xs font-semibold cursor-pointer"
            >
              I Verified
            </button>
          </div>
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 flex items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500">
            <Wallet className="w-4 h-4 text-blue-700" />
            <span>Wallet balance</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {formatNpr(userProfile?.walletBalance ?? 0)}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWallet}
          className="h-12 px-5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span>Load wallet</span>
        </button>
      </div>

      {/* Sub-navigation Segmented Control */}
      <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100 rounded-2xl">
        {(
          [
            { id: 'account', label: 'Account' },
            { id: 'orders', label: 'Orders' },
            { id: 'wallet', label: 'Wallet' },
            { id: 'support', label: 'Support' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`h-10 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              subTab === tab.id
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab 1: Account Details Form */}
      {subTab === 'account' && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 space-y-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="profile-fullname" className="block text-xs font-semibold text-slate-700">
              Full name
            </label>
            <input
              id="profile-fullname"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-phone"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
            >
              <span>Mobile number</span>
              {isPhoneLocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
            </label>
            <input
              id="profile-phone"
              type="tel"
              disabled={isPhoneLocked}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98XXXXXXXX"
              className={`w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-medium tabular-nums ${
                isPhoneLocked
                  ? 'bg-slate-50 text-slate-500 cursor-not-allowed'
                  : 'bg-white text-slate-900 focus:outline-none focus:border-blue-600'
              }`}
            />
            <p className="text-xs text-slate-400">
              {isPhoneLocked
                ? "Your mobile number can't be changed."
                : 'Set your mobile number once. After saving, it will be locked for security.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-email" className="block text-xs font-semibold text-slate-700">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              disabled
              value={displayEmail}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-700">Member since</div>
            <div className="text-sm font-medium text-slate-800 tabular-nums">
              {formatTimestamp(userProfile?.createdAt)}
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {feedback.type === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={saving || !firebaseUser.emailVerified}
              className="h-12 px-6 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {/* Sub-Tab 2: Recent Orders Summary */}
      {subTab === 'orders' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Recent Orders ({userOrders.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Open Full Orders View
            </button>
          </div>
          {userOrders.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">You have not placed any orders yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {userOrders.slice(0, 5).map((ord) => (
                <div key={ord.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {ord.productName} &middot; {ord.packageName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono-num">
                      #{ord.orderCode} &middot; {ord.status}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 tabular-nums shrink-0">
                    {formatNpr(ord.priceNpr)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Wallet Transaction Ledger */}
      {subTab === 'wallet' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Wallet Activity</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {userTransactions.length} entries
            </span>
          </div>

          {userTransactions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              No wallet transactions yet. Load funds via our eSewa QR to get started.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {userTransactions.map((tx) => {
                const isCredit =
                  tx.type === 'topup' || tx.type === 'admin_credit' || tx.type === 'refund';
                return (
                  <div
                    key={tx.id}
                    className="py-3.5 flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : isCredit
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{tx.note}</div>
                        <div className="text-xs text-slate-500 font-mono-num">
                          {tx.referenceCode} &middot; {tx.status} &middot;{' '}
                          {formatTimestamp(tx.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-bold tabular-nums ${
                          tx.status === 'rejected'
                            ? 'text-slate-400 line-through'
                            : tx.status === 'pending'
                              ? 'text-amber-700'
                              : isCredit
                                ? 'text-emerald-700'
                                : 'text-slate-900'
                        }`}
                      >
                        {isCredit ? '+' : '-'}
                        {formatNpr(tx.amountNpr)}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {tx.status === 'pending' ? 'Pending Approval' : `Bal: ${formatNpr(tx.balanceAfter)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 4: Support */}
      {subTab === 'support' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Customer Support</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Need help with a pending game top-up or eSewa QR wallet verification? Include your Order
            Code (<span className="font-mono-num">#ZX-...</span>) or eSewa Request Code (
            <span className="font-mono-num">ESW-...</span>) when contacting our support desk.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-xs text-slate-500">Support Email</div>
              <a
                href="mailto:support@zxstore.com"
                className="font-semibold text-blue-700 hover:underline"
              >
                support@zxstore.com
              </a>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-xs text-slate-500">Operating Hours</div>
              <div className="font-semibold text-slate-900">07:00 – 23:30 NPT Daily</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
