'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    avatar?: string;
    rating: number;
    rank: string;
    totalBattles: number;
    wins: number;
    losses: number;
    leetcodeTotalSolved?: number;
    leetcodeContestRating?: number;
  };
  winRate: number;
  weeklyWins?: number;
  monthlyWins?: number;
}

type LeaderboardTab = 'global' | 'weekly' | 'monthly' | 'leetcode';

const RANK_COLORS: Record<string, string> = {
  bronze: 'text-amber-600',
  silver: 'text-gray-400',
  gold: 'text-yellow-500',
  platinum: 'text-cyan-400',
  diamond: 'text-blue-400',
  master: 'text-purple-500',
  grandmaster: 'text-red-500',
  legend: 'text-orange-400',
};

const RANK_BG: Record<string, string> = {
  bronze: 'bg-amber-600/10',
  silver: 'bg-gray-400/10',
  gold: 'bg-yellow-500/10',
  platinum: 'bg-cyan-400/10',
  diamond: 'bg-blue-400/10',
  master: 'bg-purple-500/10',
  grandmaster: 'bg-red-500/10',
  legend: 'bg-orange-400/10',
};

export default function RankingsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('global');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLeaderboard();
  }, [page, activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'leetcode' ? 'leetcode' : 'leaderboard';
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      
      if (activeTab === 'weekly') params.set('period', 'weekly');
      if (activeTab === 'monthly') params.set('period', 'monthly');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rankings/${endpoint}?${params}`
      );
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.data.items || data.data);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: LeaderboardTab; label: string; icon: string }[] = [
    { id: 'global', label: 'Global', icon: '🌍' },
    { id: 'weekly', label: 'Weekly', icon: '📅' },
    { id: 'monthly', label: 'Monthly', icon: '📆' },
    { id: 'leetcode', label: 'LeetCode', icon: '💻' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboards</h1>
        <p className="text-muted-foreground mt-1">Top players in CodeClash</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-muted-foreground mt-4">Loading rankings...</div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12 border rounded-2xl bg-card">
          <div className="text-4xl mb-4">🏆</div>
          <div className="text-lg font-semibold">No rankings yet</div>
          <div className="text-muted-foreground mt-1">Be the first to compete!</div>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {activeTab !== 'leetcode' && leaderboard.length >= 3 && (
            <div className="flex justify-center items-end gap-4 mb-8">
              {/* 2nd Place */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-400/10 border-2 border-gray-400 flex items-center justify-center text-2xl font-bold text-gray-400 mx-auto">
                  {leaderboard[1].user.username[0].toUpperCase()}
                </div>
                <div className="mt-2 font-semibold">{leaderboard[1].user.username}</div>
                <div className="text-sm text-muted-foreground">{leaderboard[1].user.rating} pts</div>
                <div className="w-24 h-24 bg-gray-400/10 rounded-t-lg flex items-center justify-center mt-2">
                  <span className="text-3xl font-bold text-gray-400">2</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center">
                <div className="text-2xl mb-2">👑</div>
                <div className="w-24 h-24 rounded-full bg-yellow-500/10 border-2 border-yellow-500 flex items-center justify-center text-3xl font-bold text-yellow-500 mx-auto">
                  {leaderboard[0].user.username[0].toUpperCase()}
                </div>
                <div className="mt-2 font-semibold">{leaderboard[0].user.username}</div>
                <div className="text-sm text-muted-foreground">{leaderboard[0].user.rating} pts</div>
                <div className="w-28 h-32 bg-yellow-500/10 rounded-t-lg flex items-center justify-center mt-2">
                  <span className="text-4xl font-bold text-yellow-500">1</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-amber-600/10 border-2 border-amber-600 flex items-center justify-center text-xl font-bold text-amber-600 mx-auto">
                  {leaderboard[2].user.username[0].toUpperCase()}
                </div>
                <div className="mt-2 font-semibold">{leaderboard[2].user.username}</div>
                <div className="text-sm text-muted-foreground">{leaderboard[2].user.rating} pts</div>
                <div className="w-20 h-16 bg-amber-600/10 rounded-t-lg flex items-center justify-center mt-2">
                  <span className="text-2xl font-bold text-amber-600">3</span>
                </div>
              </div>
            </div>
          )}

          {/* Full Table */}
          <div className="border rounded-xl overflow-hidden bg-card">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Player</th>
                  {activeTab === 'leetcode' ? (
                    <>
                      <th className="px-4 py-3 text-left text-sm font-medium">Problems Solved</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Contest Rating</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Rank</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Battles</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Win Rate</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.user.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        entry.rank === 1 ? 'text-yellow-500' :
                        entry.rank === 2 ? 'text-gray-400' :
                        entry.rank === 3 ? 'text-amber-600' : ''
                      }`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${RANK_BG[entry.user.rank] || 'bg-muted'} flex items-center justify-center text-sm font-bold`}>
                          {entry.user.avatar ? (
                            <img src={entry.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            entry.user.username[0].toUpperCase()
                          )}
                        </div>
                        <a href={`/profile/${entry.user.username}`} className="font-medium hover:text-primary transition-colors">
                          {entry.user.username}
                        </a>
                      </div>
                    </td>
                    {activeTab === 'leetcode' ? (
                      <>
                        <td className="px-4 py-3 font-mono">{entry.user.leetcodeTotalSolved || 0}</td>
                        <td className="px-4 py-3 font-mono">{entry.user.leetcodeContestRating || 0}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono font-semibold">{entry.user.rating}</td>
                        <td className="px-4 py-3">
                          <span className={RANK_COLORS[entry.user.rank] || ''}>
                            {entry.user.rank.charAt(0).toUpperCase() + entry.user.rank.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{entry.user.totalBattles}</td>
                        <td className="px-4 py-3">
                          <span className={entry.winRate >= 50 ? 'text-green-500' : 'text-red-500'}>
                            {entry.winRate.toFixed(1)}%
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg font-medium disabled:opacity-50 hover:bg-accent transition-colors"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg font-medium disabled:opacity-50 hover:bg-accent transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
