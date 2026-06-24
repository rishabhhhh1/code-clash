import { useState } from "react";
import { useGetGlobalLeaderboard, useGetTopPlayers } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Leaderboard() {
  const { data: topPlayers, isLoading: topLoading } = useGetTopPlayers();
  const { data: globalLeaderboard, isLoading: globalLoading } = useGetGlobalLeaderboard({ limit: 100 });
  const [activeTab, setActiveTab] = useState<"rating" | "wins" | "streak">("rating");

  return (
    <div className="py-8 space-y-12 animate-in fade-in duration-500">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-2">Global rankings and top performers.</p>
      </div>

      {/* Top 3 Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["byRating", "byWins", "byStreak"].map((category, idx) => {
          const catData = topPlayers?.[category as keyof typeof topPlayers] || [];
          const topUser = catData[0];
          const titles = ["Highest Rating", "Most Wins", "Longest Streak"];

          if (!topUser) return null;

          return (
            <div key={category} className="border border-border p-6 bg-background relative overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                {titles[idx]}
              </div>
              <div className="text-xl font-bold mb-1">{topUser.username}</div>
              <div className="text-2xl font-mono text-primary">
                {category === 'byRating' ? `${topUser.rating} LP` : 
                 category === 'byWins' ? `${topUser.battleWins} Wins` : 
                 `${topUser.winStreak} Streak`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border">
          <button 
            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'rating' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('rating')}
          >
            By Rating
          </button>
          <button 
            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'wins' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('wins')}
          >
            By Wins
          </button>
          <button 
            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'streak' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('streak')}
          >
            By Streak
          </button>
        </div>

        <div className="border border-border bg-background overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium w-16">Rank</th>
                <th className="px-6 py-4 font-medium">Player</th>
                <th className="px-6 py-4 font-medium text-right">Rating</th>
                <th className="px-6 py-4 font-medium text-right">Wins</th>
                <th className="px-6 py-4 font-medium text-right">Win Rate</th>
                <th className="px-6 py-4 font-medium text-right">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {globalLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading ranks...</td></tr>
              ) : globalLeaderboard?.map((entry: any, i: number) => (
                <tr key={entry.userId} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-6 py-4 font-mono text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/profile/${entry.username}`}>
                      <span className="font-medium hover:text-primary transition-colors cursor-pointer">
                        {entry.username}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-mono text-right text-primary">{entry.rating}</td>
                  <td className="px-6 py-4 font-mono text-right">{entry.battleWins}</td>
                  <td className="px-6 py-4 font-mono text-right">{Math.round(entry.winRate * 100)}%</td>
                  <td className="px-6 py-4 font-mono text-right">{entry.winStreak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
