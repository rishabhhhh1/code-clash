import { useState } from "react";
import { useGetGlobalLeaderboard, useGetTopPlayers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Flame, Medal, Award } from "lucide-react";
import { Link } from "wouter";

export default function Leaderboard() {
  const { data: topPlayers, isLoading: topLoading } = useGetTopPlayers();
  const { data: globalLeaderboard, isLoading: globalLoading } = useGetGlobalLeaderboard({ limit: 100 });
  const [activeTab, setActiveTab] = useState("rating");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Trophy className="w-10 h-10 text-primary" />
        <div>
          <h1 className="text-4xl font-black tracking-tight">GLOBAL LEADERBOARD</h1>
          <p className="text-muted-foreground mt-1 font-mono">The best of the best in CodeClash arena.</p>
        </div>
      </div>

      {/* Top 3 Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["byRating", "byWins", "byStreak"].map((category, idx) => {
          const catData = topPlayers?.[category as keyof typeof topPlayers] || [];
          const topUser = catData[0];
          const icons = [Award, Trophy, Flame];
          const Icon = icons[idx];
          const titles = ["Highest Rating", "Most Wins", "Longest Streak"];

          if (!topUser) return null;

          return (
            <Card key={category} className={`border-${idx === 0 ? 'primary' : idx === 1 ? 'accent' : 'destructive'}/50 bg-card overflow-hidden relative`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Icon className={`w-32 h-32 text-${idx === 0 ? 'primary' : idx === 1 ? 'accent' : 'destructive'}`} />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="w-4 h-4" /> {titles[idx]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{topUser.username}</div>
                <div className="text-3xl font-mono mt-2 text-foreground font-bold">
                  {category === 'byRating' ? `${topUser.rating} LP` : 
                   category === 'byWins' ? `${topUser.battleWins} Wins` : 
                   `${topUser.winStreak} Streak`}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Rankings</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rating">Rating</TabsTrigger>
                <TabsTrigger value="wins">Wins</TabsTrigger>
                <TabsTrigger value="streak">Streak</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
                <tr>
                  <th className="px-6 py-4 font-medium">Rank</th>
                  <th className="px-6 py-4 font-medium">Player</th>
                  <th className="px-6 py-4 font-medium">Rating</th>
                  <th className="px-6 py-4 font-medium">Wins</th>
                  <th className="px-6 py-4 font-medium">Win Rate</th>
                  <th className="px-6 py-4 font-medium">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {globalLeaderboard?.map((entry: any, i: number) => (
                  <tr key={entry.userId} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-mono font-bold">
                        {i === 0 && <Medal className="w-5 h-5 text-yellow-500" />}
                        {i === 1 && <Medal className="w-5 h-5 text-gray-400" />}
                        {i === 2 && <Medal className="w-5 h-5 text-amber-700" />}
                        {i > 2 && <span className="w-5 text-center text-muted-foreground">{i + 1}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/profile/${entry.username}`}>
                        <span className="font-bold hover:underline cursor-pointer flex items-center gap-2">
                          {entry.username}
                          <Badge variant="outline" className="text-[10px]">{entry.rank}</Badge>
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-primary">{entry.rating}</td>
                    <td className="px-6 py-4 font-mono">{entry.battleWins}</td>
                    <td className="px-6 py-4 font-mono">{Math.round(entry.winRate * 100)}%</td>
                    <td className="px-6 py-4 font-mono">
                      {entry.winStreak > 2 ? (
                        <span className="text-destructive flex items-center gap-1">
                          {entry.winStreak} <Flame className="w-3 h-3" />
                        </span>
                      ) : entry.winStreak}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
