'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  rating: number;
  rank: string;
  totalBattles: number;
  wins: number;
  losses: number;
  leetcodeUsername?: string;
  leetcodeTotalSolved?: number;
  leetcodeEasySolved?: number;
  leetcodeMediumSolved?: number;
  leetcodeHardSolved?: number;
  leetcodeAcceptanceRate?: number;
  leetcodeContestRating?: number;
  leetcodeGlobalRanking?: number;
  leetcodeSyncedAt?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/${username}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setProfile(data.data);
        // Check if this is the current user's profile
        const currentUser = localStorage.getItem('user');
        if (currentUser) {
          const user = JSON.parse(currentUser);
          setIsOwnProfile(user.username === username || user.id === data.data.id);
        }
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (e) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = () => {
    if (!profile || profile.totalBattles === 0) return '0%';
    return `${Math.round((profile.wins / profile.totalBattles) * 100)}%`;
  };

  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      'Bronze': 'text-orange-400',
      'Silver': 'text-gray-300',
      'Gold': 'text-yellow-400',
      'Platinum': 'text-cyan-400',
      'Diamond': 'text-blue-400',
      'Master': 'text-purple-400',
      'Grandmaster': 'text-red-500',
    };
    return colors[rank] || 'text-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center p-8 border rounded-2xl bg-card">
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="p-6 border rounded-2xl bg-card">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{profile.username}</h1>
                <span className={`text-lg font-semibold ${getRankColor(profile.rank)}`}>
                  {profile.rank}
                </span>
              </div>
              {profile.bio && (
                <p className="text-muted-foreground">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Rating: <span className="font-semibold text-foreground">{profile.rating}</span></span>
                <span>•</span>
                <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-xl bg-card text-center">
            <div className="text-2xl font-bold">{profile.totalBattles}</div>
            <div className="text-sm text-muted-foreground">Total Battles</div>
          </div>
          <div className="p-4 border rounded-xl bg-card text-center">
            <div className="text-2xl font-bold text-green-500">{profile.wins}</div>
            <div className="text-sm text-muted-foreground">Wins</div>
          </div>
          <div className="p-4 border rounded-xl bg-card text-center">
            <div className="text-2xl font-bold text-red-500">{profile.losses}</div>
            <div className="text-sm text-muted-foreground">Losses</div>
          </div>
          <div className="p-4 border rounded-xl bg-card text-center">
            <div className="text-2xl font-bold">{getWinRate()}</div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </div>
        </div>

        {/* Rating History (Placeholder) */}
        <div className="p-6 border rounded-2xl bg-card">
          <h2 className="text-lg font-semibold mb-4">Rating History</h2>
          <div className="h-48 flex items-center justify-center border rounded-lg bg-muted/20">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-2">📊</div>
              <div>Rating chart coming soon</div>
            </div>
          </div>
        </div>

        {/* LeetCode Stats */}
        {profile.leetcodeUsername && (
          <div className="p-6 border rounded-2xl bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">LeetCode Stats</h2>
              <a
                href={`https://leetcode.com/${profile.leetcodeUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View on LeetCode →
              </a>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Username: <span className="font-semibold text-foreground">{profile.leetcodeUsername}</span></span>
              {profile.leetcodeSyncedAt && (
                <span>Last synced: {new Date(profile.leetcodeSyncedAt).toLocaleDateString()}</span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-xl bg-muted/20 text-center">
                <div className="text-2xl font-bold">{profile.leetcodeTotalSolved || 0}</div>
                <div className="text-sm text-muted-foreground">Total Solved</div>
              </div>
              <div className="p-4 border rounded-xl bg-green-500/10 text-center">
                <div className="text-2xl font-bold text-green-500">{profile.leetcodeEasySolved || 0}</div>
                <div className="text-sm text-muted-foreground">Easy</div>
              </div>
              <div className="p-4 border rounded-xl bg-yellow-500/10 text-center">
                <div className="text-2xl font-bold text-yellow-500">{profile.leetcodeMediumSolved || 0}</div>
                <div className="text-sm text-muted-foreground">Medium</div>
              </div>
              <div className="p-4 border rounded-xl bg-red-500/10 text-center">
                <div className="text-2xl font-bold text-red-500">{profile.leetcodeHardSolved || 0}</div>
                <div className="text-sm text-muted-foreground">Hard</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl bg-muted/20">
                <div className="text-sm text-muted-foreground">Acceptance Rate</div>
                <div className="text-xl font-bold mt-1">{profile.leetcodeAcceptanceRate || 0}%</div>
              </div>
              <div className="p-4 border rounded-xl bg-muted/20">
                <div className="text-sm text-muted-foreground">Contest Rating</div>
                <div className="text-xl font-bold mt-1">{profile.leetcodeContestRating || 0}</div>
              </div>
            </div>

            {profile.leetcodeGlobalRanking && (
              <div className="p-4 border rounded-xl bg-primary/5">
                <div className="text-sm text-muted-foreground">Global Ranking</div>
                <div className="text-2xl font-bold mt-1 text-primary">
                  #{profile.leetcodeGlobalRanking.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Battles (Placeholder) */}
        <div className="p-6 border rounded-2xl bg-card">
          <h2 className="text-lg font-semibold mb-4">Recent Battles</h2>
          <div className="space-y-3">
            <div className="p-4 border rounded-lg bg-muted/20 text-center text-muted-foreground">
              Battle history coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
