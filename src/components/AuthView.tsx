import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ActiveTab, APP_LOGO_PATH, VALIDATION_LIMITS } from '../types';

interface AuthViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onSuccess: (user: FirebaseUser) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onNavigate, onSuccess }) => {
  const { signInWithGoogle, loginWithEmail, registerWithEmail, sendResetPassword } = useStore();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsConsoleEnable, setNeedsConsoleEnable] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsConsoleEnable(false);
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onSuccess(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled.';
      if (!msg.includes('popup-closed-by-user')) {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsConsoleEnable(false);
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await loginWithEmail(email, password);
        onSuccess(user);
      } else if (mode === 'register') {
        if (fullName.trim().length < VALIDATION_LIMITS.USER_NAME_MIN) {
          throw new Error('Please enter your full name (at least 2 characters).');
        }
        if (
          phone.trim().length < VALIDATION_LIMITS.PHONE_MIN ||
          phone.trim().length > VALIDATION_LIMITS.PHONE_MAX ||
          !VALIDATION_LIMITS.PHONE_REGEX.test(phone.trim())
        ) {
          throw new Error('Please enter a valid phone number (e.g. 98XXXXXXXX).');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        const user = await registerWithEmail({ fullName, email, phone, password });
        onSuccess(user);
      } else {
        await sendResetPassword(email);
        setInfoMsg('Password reset link sent to your email inbox.');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const rawMsg = err instanceof Error ? err.message : 'Authentication error.';
      if (code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
        setNeedsConsoleEnable(true);
        setErrorMsg(
          'Email/Password sign-in is not enabled in your Firebase Console yet. Use Continue with Google below for instant verified access, or enable Email/Password in Firebase Console.'
        );
      } else if (code === 'auth/invalid-credential') {
        setErrorMsg('Incorrect email or password. Please check your credentials and try again.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Log in instead.');
      } else {
        setErrorMsg(rawMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-2 sm:py-6 space-y-5">
      {/* Top Back to Store Link */}
      <div>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="h-10 px-4 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to store</span>
        </button>
      </div>

      {/* Centered ZX STORE Brand Logo & Title */}
      <div className="flex flex-col items-center justify-center gap-2.5 pt-1">
        {!logoFailed && (
          <img
            src={APP_LOGO_PATH}
            alt="ZX STORE"
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
            className="w-20 h-20 rounded-3xl object-cover border border-slate-200 shadow-sm"
          />
        )}
        <span className="text-2xl font-extrabold tracking-tight text-slate-900">
          <span className="text-blue-700">ZX</span> STORE
        </span>
      </div>

      {/* Auth Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'login'
              ? 'Welcome back'
              : mode === 'register'
                ? 'Create account'
                : 'Reset password'}
          </h1>
          <p className="text-sm text-slate-500">
            {mode === 'login'
              ? 'Log in to top up games and track your orders'
              : mode === 'register'
                ? 'Join ZX STORE in seconds'
                : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Instant Verified Google Sign-In */}
        {mode !== 'reset' && (
          <div className="space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-xs text-slate-400 whitespace-nowrap">
                or with email
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-fullname" className="block text-xs font-semibold text-slate-700">
                Full name
              </label>
              <input
                id="auth-fullname"
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              maxLength={120}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          {mode === 'register' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-phone" className="block text-xs font-semibold text-slate-700">
                Phone number
              </label>
              <input
                id="auth-phone"
                type="tel"
                required
                minLength={7}
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          )}

          {mode !== 'reset' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === 'register' ? 8 : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setErrorMsg(null);
                }}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
              <p className="font-medium">{errorMsg}</p>
              {needsConsoleEnable && (
                <div className="pt-1 border-t border-red-200/80 text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Info className="w-3.5 h-3.5 text-blue-700" />
                    <span>How to enable Email/Password in Firebase:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-600">
                    <li>Open Firebase Console &rarr; Project &ldquo;inner-energy-69v0l&rdquo;</li>
                    <li>Go to Build &rarr; Authentication &rarr; Sign-in method</li>
                    <li>Click Add new provider &rarr; Email/Password &rarr; Enable &amp; Save</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              {infoMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Log in'
                : mode === 'register'
                  ? 'Create account'
                  : 'Send reset link'}
          </button>
        </form>

        {/* Mode Switch Footer */}
        <div className="text-center text-sm text-slate-600">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
