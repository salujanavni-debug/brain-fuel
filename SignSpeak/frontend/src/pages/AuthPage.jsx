import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const {
    user,
    isSupabaseConfigured,
    passwordRecoveryMode,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
  } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectTo = searchParams.get('redirect') || '/progress';

  const [tab, setTab] = useState(() => {
    const m = searchParams.get('mode');
    if (m === 'signup') return 'signup';
    if (m === 'reset') return 'reset';
    return 'login';
  });

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [noticeMsg, setNoticeMsg] = useState(null);

  useEffect(() => {
    if (user && !passwordRecoveryMode) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, passwordRecoveryMode, redirectTo, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    const res = await signIn(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Unable to sign in.');
      return;
    }
    navigate(redirectTo, { replace: true });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    const res = await signUp(email, password, displayName);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Unable to create account.');
      return;
    }
    setNoticeMsg(res.notice || 'Account created.');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    const res = await requestPasswordReset(email);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Unable to send reset email.');
      return;
    }
    setNoticeMsg(res.notice || 'Password reset email sent.');
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    const res = await updatePassword(newPassword);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Unable to update password.');
      return;
    }
    setNoticeMsg(res.notice || 'Password updated.');
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-12 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-bold text-[#6D28D9]">Optional Cloud Progress &amp; Profile Sync</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#292544]">
          SignSpeak Account
        </h1>
        <p className="mt-2 text-sm text-[#292544]/75">
          Sign in to sync your learning progress, quiz scores, and text-only translation history.
          Camera frames are never stored.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div
          role="note"
          className="rounded-3xl border border-[#FDBA74] bg-[#FED7AA]/45 px-5 py-4 text-xs text-[#292544]"
        >
          <p className="flex items-center gap-2 font-extrabold text-[#9A3412]">
            <Database className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Supabase Auth Not Configured in Environment Yet</span>
          </p>
          <p className="mt-1 font-semibold leading-relaxed text-[#292544]/85">
            Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> (and run{' '}
            <code className="font-mono">supabase/migrations/*.sql</code>) to enable accounts.
            Meanwhile,{' '}
            <Link to="/translator" className="text-[#6D28D9] underline">
              Translator
            </Link>
            ,{' '}
            <Link to="/learn" className="text-[#6D28D9] underline">
              Learn Sign Language
            </Link>
            , and{' '}
            <Link to="/emergency" className="text-[#6D28D9] underline">
              Emergency Mode
            </Link>{' '}
            remain ready without an account.
          </p>
        </div>
      )}

      <Card tone="default">
        {passwordRecoveryMode ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <h2 className="text-lg font-extrabold text-[#292544]">Set New Password</h2>
            <div>
              <label htmlFor="new-password-input" className="block text-xs font-bold text-[#292544]">
                New Password
              </label>
              <input
                id="new-password-input"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-4 py-3 text-sm text-[#292544] focus:border-[#7C3AED] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" size="md" className="w-full" disabled={submitting}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span>{submitting ? 'Updating...' : 'Update Password'}</span>
            </Button>
          </form>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl bg-[#EDE9FE]/50 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg(null);
                  setNoticeMsg(null);
                }}
                className={`rounded-xl py-2 text-xs font-extrabold transition-colors cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white text-[#292544] shadow-2xs'
                    : 'text-[#292544]/70 hover:text-[#292544]'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setErrorMsg(null);
                  setNoticeMsg(null);
                }}
                className={`rounded-xl py-2 text-xs font-extrabold transition-colors cursor-pointer ${
                  tab === 'signup'
                    ? 'bg-white text-[#292544] shadow-2xs'
                    : 'text-[#292544]/70 hover:text-[#292544]'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('reset');
                  setErrorMsg(null);
                  setNoticeMsg(null);
                }}
                className={`rounded-xl py-2 text-xs font-extrabold transition-colors cursor-pointer ${
                  tab === 'reset'
                    ? 'bg-white text-[#292544] shadow-2xs'
                    : 'text-[#292544]/70 hover:text-[#292544]'
                }`}
              >
                Reset Password
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-2xl border border-[#FCA5A5] bg-[#FCA5A5]/30 px-4 py-3 text-xs font-bold text-[#991B1B]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {noticeMsg && (
              <div
                role="status"
                className="mb-4 flex items-start gap-2 rounded-2xl border border-[#6EE7B7] bg-[#A7F3D0]/45 px-4 py-3 text-xs font-bold text-[#065F46]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{noticeMsg}</span>
              </div>
            )}

            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-bold text-[#292544]">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-4 py-3 text-sm text-[#292544] focus:border-[#7C3AED] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="auth-password" className="block text-xs font-bold text-[#292544]">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-4 py-3 text-sm text-[#292544] focus:border-[#7C3AED] focus:outline-none"
                  />
                </div>
                <Button type="submit" variant="primary" size="md" className="w-full" disabled={submitting}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                </Button>
              </form>
            )}

            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-bold text-[#292544]">
                    Display Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Aarav"
                    className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-4 py-3 text-sm text-[#292544] focus:border-[#7C3AED] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="signup-email" className="block text-xs font-bold text-[#292544]">
                    Email Address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-4 py-3 text-sm text-[#292544] focus:border-[#7C3AED] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-bold text-[#292544]">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-4 py-3 text-sm text-[#292544] focus:border-[#7C3AED] focus:outline-none"
                  />
                </div>
                <Button type="submit" variant="primary" size="md" className="w-full" disabled={submitting}>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{submitting ? 'Creating account...' : 'Create Account'}</span>
                </Button>
              </form>
            )}

            {tab === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <p className="text-xs font-semibold text-[#292544]/75">
                  Enter the email address for your SignSpeak account to receive a password reset
                  link.
                </p>
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-bold text-[#292544]">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-4 py-3 text-sm text-[#292544] focus:border-[#7C3AED] focus:outline-none"
                  />
                </div>
                <Button type="submit" variant="primary" size="md" className="w-full" disabled={submitting}>
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  <span>{submitting ? 'Sending email...' : 'Send Password Reset Email'}</span>
                </Button>
              </form>
            )}
          </>
        )}

        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-[#EDE9FE]/45 px-4 py-3 text-xs font-semibold text-[#292544]/80">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]" aria-hidden="true" />
          <span>
            Privacy Notice: Row Level Security (RLS) restricts personal progress, quiz results, and
            text translation history to your account only. Webcam frames are never uploaded.
          </span>
        </div>
      </Card>
    </div>
  );
}
