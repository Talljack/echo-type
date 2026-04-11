'use client';

import { useEffect, useState } from 'react';

export default function DesktopCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const url = new URL(window.location.href);
      const exchangeId = url.searchParams.get('exchange_id');

      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setStatus('error');
        setErrorMessage(params.get('error_description') || 'No tokens received');
        return;
      }

      if (!exchangeId) {
        setStatus('error');
        setErrorMessage('Missing exchange ID');
        return;
      }

      try {
        const res = await fetch('/api/auth/session-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exchangeId, accessToken, refreshToken }),
        });

        if (!res.ok) throw new Error('Failed to store session');

        setStatus('success');
      } catch {
        setStatus('error');
        setErrorMessage('Failed to complete sign-in');
      }
    }

    handleCallback();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200/50">
          <span className="text-2xl font-bold text-white">E</span>
        </div>

        {status === 'processing' && (
          <>
            <h2 className="text-xl font-semibold text-slate-900">Signing you in...</h2>
            <p className="mt-2 text-sm text-slate-500">Please wait while we complete authentication.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 className="text-xl font-semibold text-green-700">Login successful!</h2>
            <p className="mt-2 text-sm text-slate-500">You can close this tab and return to EchoType.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-xl font-semibold text-red-700">Login failed</h2>
            <p className="mt-2 text-sm text-slate-500">{errorMessage}</p>
            <p className="mt-4 text-xs text-slate-400">Please close this tab and try again in the app.</p>
          </>
        )}
      </div>
    </div>
  );
}
