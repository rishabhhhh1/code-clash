'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserSettings {
  id: string;
  codeforcesHandle: string;
  username: string;
  avatar?: string;
  bio?: string;
  rating: number;
  maxRating: number;
  rank: string;
  contribution: number;
  battleWins: number;
  battleLosses: number;
  winStreak: number;
  totalBattles: number;
  favoriteTopics: string[];
}

export default function SettingsPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const res = await fetch(`${apiUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setSettings(data.data);
        setBio(data.data.bio || '');
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Profile updated successfully');
        setSettings(data.data);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncCodeforces = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/auth/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Codeforces profile synced');
        setSettings(data.data);
      } else {
        setError(data.error || 'Failed to sync Codeforces profile');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm">
            {success}
          </div>
        )}

        <div className="p-6 border rounded-2xl bg-card space-y-4">
          <h2 className="text-lg font-semibold">Codeforces Account</h2>
          <p className="text-sm text-muted-foreground">
            Your CodeClash account is linked to your Codeforces handle. Battles track submissions from that account.
          </p>

          {settings && (
            <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{settings.codeforcesHandle}</div>
                  <div className="text-sm text-muted-foreground">
                    Rating {settings.rating} · Max {settings.maxRating} · {settings.rank}
                  </div>
                </div>
                <a
                  href={`https://codeforces.com/profile/${settings.codeforcesHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-accent"
                >
                  View Profile
                </a>
              </div>
              <div className="text-sm text-muted-foreground">
                {settings.battleWins}W / {settings.battleLosses}L · {settings.totalBattles} battles · streak {settings.winStreak}
              </div>
            </div>
          )}

          <button
            onClick={handleSyncCodeforces}
            disabled={syncing}
            className="px-4 py-2 border rounded-lg font-medium hover:bg-accent disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync from Codeforces'}
          </button>
        </div>

        <div className="p-6 border rounded-2xl bg-card space-y-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background resize-none"
              rows={3}
              placeholder="Tell other competitors about yourself..."
            />
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
