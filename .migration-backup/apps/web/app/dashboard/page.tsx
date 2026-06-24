'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchUserData(token);
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      const [userRes, statsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const userData = await userRes.json();
      const statsData = await statsRes.json();

      if (userData.success) setUser(userData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (error) {
      console.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
        >
          Log Out
        </button>
      </div>

      {user && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="border rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Rating</div>
            <div className="text-3xl font-bold mt-1">{user.rating}</div>
            <div className="text-sm text-primary mt-1 capitalize">{user.rank}</div>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Total Battles</div>
            <div className="text-3xl font-bold mt-1">{user.totalBattles}</div>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Wins</div>
            <div className="text-3xl font-bold mt-1 text-green-500">{user.wins}</div>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className="text-3xl font-bold mt-1">
              {user.totalBattles > 0 ? ((user.wins / user.totalBattles) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/battle/create"
              className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-center"
            >
              Create Battle
            </a>
            <a
              href="/lobby"
              className="block w-full py-2 px-4 border rounded-md hover:bg-accent transition-colors text-center"
            >
              Browse Lobby
            </a>
            <a
              href="/problems"
              className="block w-full py-2 px-4 border rounded-md hover:bg-accent transition-colors text-center"
            >
              Practice Problems
            </a>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="text-muted-foreground text-center py-8">
            No recent activity
          </div>
        </div>
      </div>
    </div>
  );
}
