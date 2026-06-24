'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.data.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md p-8 space-y-6 border rounded-lg bg-card text-card-foreground shadow-lg backdrop-blur-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Log in with your Codeforces account</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="handle" className="block text-sm font-medium mb-1">
              Codeforces Handle
            </label>
            <input
              id="handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              minLength={3}
              maxLength={24}
              pattern="^[a-zA-Z0-9_\-\.]+$"
              className="w-full px-3 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="tourist"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your Codeforces username. Don&apos;t have one?{' '}
              <a href="https://codeforces.com/register" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Create one
              </a>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Logging in...' : 'Log In with Codeforces'}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground border border-dashed border-muted p-3 rounded">
          <p className="font-medium mb-1">How it works:</p>
          <p>Enter your Codeforces handle to login. We&apos;ll verify your account exists on Codeforces and sync your rating automatically.</p>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          New to Codeforces?{' '}
          <a href="https://codeforces.com/register" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Create a Codeforces account
          </a>
        </p>
      </div>
    </div>
  );
}
