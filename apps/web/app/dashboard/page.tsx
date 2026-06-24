'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { battlesAPI, rankingAPI } from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [battles, setBattles] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }

    const loadData = async () => {
      try {
        const [battlesData, leaderboardData] = await Promise.all([
          battlesAPI.getPublicLobby(),
          rankingAPI.getLeaderboard(),
        ]);
        setBattles(battlesData.activeBattles || []);
        setLeaderboard(leaderboardData || []);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, token, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">⚔️ CodeClash</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-bold">{user.username}</p>
              <p className="text-sm text-gray-400">{user.rank} • Rating: {user.rating}</p>
            </div>
            <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <p className="text-gray-400 text-sm">Rating</p>
            <p className="text-3xl font-bold text-purple-400">{user.rating}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <p className="text-gray-400 text-sm">Battles</p>
            <p className="text-3xl font-bold text-blue-400">{user.totalBattles}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <p className="text-gray-400 text-sm">Wins</p>
            <p className="text-3xl font-bold text-green-400">{user.battleWins}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <p className="text-gray-400 text-sm">Win Rate</p>
            <p className="text-3xl font-bold text-yellow-400">
              {user.totalBattles > 0 ? ((user.battleWins / user.totalBattles) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/battle/create" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-lg text-center transition-all">
            🎮 Create Battle
          </Link>
          <Link href="/matchmaking" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-lg text-center transition-all">
            ⚡ Quick Match
          </Link>
          <Link href="/lobby" className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-4 rounded-lg text-center transition-all">
            👥 Join Lobby
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Battles */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4">Active Battles</h2>
            <div className="space-y-3">
              {loading ? (
                <p className="text-gray-400">Loading...</p>
              ) : battles.length === 0 ? (
                <p className="text-gray-400">No active battles</p>
              ) : (
                battles.slice(0, 5).map((battle) => (
                  <Link
                    key={battle.id}
                    href={`/battle/${battle.code}`}
                    className="bg-slate-900 p-4 rounded-lg border border-slate-800 hover:border-purple-500 transition-all block"
                  >
                    <p className="text-white font-bold">{battle.mode.toUpperCase()}</p>
                    <p className="text-sm text-gray-400">
                      {battle.playerCount}/{battle.maxPlayers} players • {battle.difficulty}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Top Players */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Top Players</h2>
            <div className="space-y-2">
              {loading ? (
                <p className="text-gray-400">Loading...</p>
              ) : (
                leaderboard.slice(0, 10).map((player, idx) => (
                  <div key={player.userId} className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-bold text-sm">#{idx + 1}</p>
                        <p className="text-gray-400 text-xs">Rating: {player.rating}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
