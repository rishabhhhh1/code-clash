'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const provider = params.provider as string;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Check if Google returned an error
    if (error) {
      console.error(`[OAuth Callback] Provider returned error: ${error}`);
      setStatus('error');
      setErrorMessage(`OAuth provider returned an error: ${error}. Please try again.`);
      return;
    }

    if (!code || !provider) {
      console.error('[OAuth Callback] Missing code or provider', { code, provider });
      setStatus('error');
      setErrorMessage('Missing authorization code or provider. Please try logging in again.');
      return;
    }

    console.log(`[OAuth Callback] Received code for ${provider}, exchanging with backend...`);
    exchangeCode();
  }, [code, provider, error]);

  const exchangeCode = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log(`[OAuth Callback] POST ${apiUrl}/api/auth/oauth/${provider}`);

      const res = await fetch(`${apiUrl}/api/auth/oauth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      console.log(`[OAuth Callback] Backend response status: ${res.status}`);
      const data = await res.json();
      console.log(`[OAuth Callback] Backend response:`, JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data.error || data.message || `Authentication failed (HTTP ${res.status})`);
      }

      if (!data.data?.token) {
        throw new Error('No token received from backend');
      }

      // Save token to localStorage for persistent auth
      localStorage.setItem('token', data.data.token);
      console.log('[OAuth Callback] Token saved to localStorage');

      // Also set as cookie for SSR (optional, but helps with page refreshes)
      document.cookie = `token=${data.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      setStatus('success');

      // Redirect to lobby or dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/lobby';
      }, 1200);
    } catch (err: any) {
      console.error('[OAuth Callback] Exchange failed:', err);
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-muted/50 to-background">
      <div className="w-full max-w-md p-8 border rounded-2xl bg-card/60 backdrop-blur-xl shadow-xl border-muted/50 text-center space-y-6">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-semibold capitalize">Authenticating with {provider}...</h2>
            <p className="text-muted-foreground text-sm">Please wait while we set up your session.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center">
              <div className="w-12 h-12 flex items-center justify-center bg-green-500/20 text-green-500 rounded-full border border-green-500/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold">Login Successful!</h2>
            <p className="text-muted-foreground text-sm">Redirecting you to the lobby...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center">
              <div className="w-12 h-12 flex items-center justify-center bg-destructive/10 text-destructive rounded-full border border-destructive/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-destructive">Authentication Failed</h2>
            <p className="text-muted-foreground text-sm bg-destructive/5 p-3 rounded-lg border border-destructive/10">
              {errorMessage}
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm"
              >
                Return to Login
              </button>
              <p className="text-xs text-muted-foreground">
                If this keeps happening, check that your Google OAuth credentials are configured correctly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
