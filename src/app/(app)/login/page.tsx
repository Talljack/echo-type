'use client';

import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAuthStore } from '@/stores/auth-store';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Google">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-label="GitHub">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const {
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    verifyEmailOtp,
    resetEmailAuth,
    isAuthenticated,
    emailAuthLoading,
    emailAuthError,
    emailOtpSent,
    pendingEmail,
  } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('auth_error');
  const { t } = useI18n('login');

  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getLocalizedError = (error: string | null): string => {
    if (!error) return t('authFailed');
    const lower = error.toLowerCase();
    if (lower.includes('sending') && lower.includes('email')) return t('errorSendingEmail');
    if (lower.includes('rate limit')) return t('errorRateLimit');
    if (lower.includes('invalid') || lower.includes('expired')) return t('errorInvalidOtp');
    return error;
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    return () => resetEmailAuth();
  }, [resetEmailAuth]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    signInWithEmail(email.trim());
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      for (let i = 0; i < pasted.length; i++) {
        if (index + i < 6) newDigits[index + i] = pasted[i];
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(index + pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();

      if (newDigits.every((d) => d !== '')) {
        verifyEmailOtp(pendingEmail!, newDigits.join('')).then((ok) => {
          if (ok) router.replace('/dashboard');
        });
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '')) {
      verifyEmailOtp(pendingEmail!, newDigits.join('')).then((ok) => {
        if (ok) router.replace('/dashboard');
      });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleBack = () => {
    resetEmailAuth();
    setOtpDigits(['', '', '', '', '', '']);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200/50">
            <span className="text-2xl font-bold text-white">E</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {emailOtpSent ? t('checkEmail') : t('title')}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {emailOtpSent ? (
              <>
                {t('otpSentTo')} <span className="font-medium text-slate-700">{pendingEmail}</span>
              </>
            ) : (
              t('subtitle')
            )}
          </p>
          {emailOtpSent && <p className="mt-1 text-xs text-slate-400">{t('otpHint')}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {(authError || emailAuthError) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {getLocalizedError(emailAuthError)}
            </div>
          )}

          {emailOtpSent ? (
            <div className="space-y-5">
              <div className="flex justify-center gap-2">
                {otpDigits.map((digit, i) => (
                  <input
                    key={`otp-${i}`}
                    ref={(el) => {
                      otpInputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-12 w-11 rounded-lg border border-slate-200 bg-slate-50 text-center text-lg font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus={i === 0}
                    disabled={emailAuthLoading}
                  />
                ))}
              </div>

              {emailAuthLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('verifying')}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400">{t('checkSpam')}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('back')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpDigits(['', '', '', '', '', '']);
                    signInWithEmail(pendingEmail!);
                    otpInputRefs.current[0]?.focus();
                  }}
                  disabled={emailAuthLoading}
                  className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('resendCode')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11 gap-2 text-sm font-medium cursor-pointer"
                  onClick={() => signInWithGoogle()}
                >
                  <GoogleIcon className="h-4 w-4" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="h-11 gap-2 text-sm font-medium cursor-pointer"
                  onClick={() => signInWithGitHub()}
                >
                  <GitHubIcon className="h-4 w-4" />
                  GitHub
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400">{t('orContinueWith')}</span>
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11"
                      required
                      disabled={emailAuthLoading}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer"
                  disabled={emailAuthLoading || !email.trim()}
                >
                  {emailAuthLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('sendingCode')}
                    </>
                  ) : (
                    <>
                      {t('continueWithEmail')}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  {t('continueWithout')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
