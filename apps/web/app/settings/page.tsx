'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserSettings {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  leetcodeUsername?: string;
  leetcodeSyncedAt?: string;
  showLeetCodeStats: boolean;
  emailNotifications: boolean;
  battleInvites: boolean;
}

interface OAuthAccount {
  provider: string;
  username?: string;
  email?: string;
  avatar?: string;
  linkedAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [oauthAccounts, setOAuthAccounts] = useState<OAuthAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [bio, setBio] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [showLeetCodeStats, setShowLeetCodeStats] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [battleInvites, setBattleInvites] = useState(true);

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

      const [settingsRes, accountsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me/accounts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const settingsData = await settingsRes.json();
      const accountsData = await accountsRes.json();

      if (settingsData.success) {
        const user = settingsData.data;
        setSettings(user);
        setBio(user.bio || '');
        setLeetcodeUsername(user.leetcodeUsername || '');
        setShowLeetCodeStats(user.showLeetCodeStats ?? true);
        setEmailNotifications(user.emailNotifications ?? true);
        setBattleInvites(user.battleInvites ?? true);
      }

      if (accountsData.success) {
        setOAuthAccounts(accountsData.data.accounts || []);
      }
    } catch (e) {
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bio,
            showLeetCodeStats,
            emailNotifications,
            battleInvites,
          }),
        }
      );
      const data = await res.json();

      if (data.success) {
        setSuccess('Profile updated successfully');
        // Update local storage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...currentUser, bio }));
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (e) {
      setError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectLeetCode = async () => {
    if (!leetcodeUsername.trim()) {
      setError('Please enter a LeetCode username');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me/leetcode`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ username: leetcodeUsername }),
        }
      );
      const data = await res.json();

      if (data.success) {
        setSuccess('LeetCode account connected successfully');
        fetchSettings(); // Refresh settings
      } else {
        setError(data.error || 'Failed to connect LeetCode');
      }
    } catch (e) {
      setError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncLeetCode = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me/leetcode/sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();

      if (data.success) {
        setSuccess('LeetCode stats synced successfully');
        fetchSettings();
      } else {
        setError(data.error || 'Failed to sync LeetCode');
      }
    } catch (e) {
      setError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectLeetCode = async () => {
    if (!confirm('Are you sure you want to disconnect your LeetCode account?')) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me/leetcode`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();

      if (data.success) {
        setSuccess('LeetCode account disconnected');
        setLeetcodeUsername('');
        fetchSettings();
      } else {
        setError(data.error || 'Failed to disconnect LeetCode');
      }
    } catch (e) {
      setError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkOAuth = async (provider: string) => {
    if (!confirm(`Are you sure you want to unlink your ${provider} account?`)) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/oauth/${provider}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();

      if (data.success) {
        setSuccess(`${provider} account unlinked`);
        fetchSettings();
      } else {
        setError(data.error || `Failed to unlink ${provider}`);
      }
    } catch (e) {
      setError('Network error occurred');
    } finally {
      setSaving(false);
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

        {/* Messages */}
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

        {/* Profile Section */}
        <div className="p-6 border rounded-2xl bg-card space-y-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background resize-none"
              rows={3}
              placeholder="Tell us about yourself..."
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

        {/* LeetCode Section */}
        <div className="p-6 border rounded-2xl bg-card space-y-4">
          <h2 className="text-lg font-semibold">LeetCode Integration</h2>
          
          {settings?.leetcodeUsername ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div>
                  <div className="font-medium">{settings.leetcodeUsername}</div>
                  <div className="text-sm text-muted-foreground">
                    Connected {settings.leetcodeSyncedAt ? `• Last synced ${new Date(settings.leetcodeSyncedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSyncLeetCode}
                    disabled={saving}
                    className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50"
                  >
                    Sync
                  </button>
                  <button
                    onClick={handleDisconnectLeetCode}
                    disabled={saving}
                    className="px-3 py-1.5 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/5 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showLeetCodeStats"
                  checked={showLeetCodeStats}
                  onChange={(e) => setShowLeetCodeStats(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showLeetCodeStats" className="text-sm">
                  Show LeetCode stats on my profile
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your LeetCode account to display your stats and sync your progress.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={leetcodeUsername}
                  onChange={(e) => setLeetcodeUsername(e.target.value)}
                  placeholder="LeetCode username"
                  className="flex-1 px-3 py-2 border rounded-lg bg-background"
                />
                <button
                  onClick={handleConnectLeetCode}
                  disabled={saving || !leetcodeUsername.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OAuth Accounts Section */}
        <div className="p-6 border rounded-2xl bg-card space-y-4">
          <h2 className="text-lg font-semibold">Connected Accounts</h2>
          
          <div className="space-y-3">
            {['google', 'github'].map((provider) => {
              const account = oauthAccounts.find(a => a.provider === provider);
              return (
                <div key={provider} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {provider === 'google' ? '🔍' : '🐙'}
                    </div>
                    <div>
                      <div className="font-medium capitalize">{provider}</div>
                      {account ? (
                        <div className="text-sm text-muted-foreground">
                          {account.username || account.email}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Not connected</div>
                      )}
                    </div>
                  </div>
                  {account ? (
                    <button
                      onClick={() => handleUnlinkOAuth(provider)}
                      disabled={saving}
                      className="px-3 py-1.5 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/5 disabled:opacity-50"
                    >
                      Unlink
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/auth/login?provider=${provider}`)}
                      className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-accent"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="p-6 border rounded-2xl bg-card space-y-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive email updates about your activity</div>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Battle Invites</div>
                <div className="text-sm text-muted-foreground">Receive notifications for battle invitations</div>
              </div>
              <input
                type="checkbox"
                checked={battleInvites}
                onChange={(e) => setBattleInvites(e.target.checked)}
                className="rounded"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
