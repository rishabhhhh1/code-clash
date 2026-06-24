import { useRoute, Link } from "wouter";
import { useGetBattle, getGetBattleQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy } from "lucide-react";

export default function BattleResults() {
  const [, params] = useRoute("/battle/:battleId/results");
  const battleId = parseInt(params?.battleId || "0");

  const { data: battle, isLoading } = useGetBattle(battleId, {
    query: {
      enabled: !!battleId,
      queryKey: getGetBattleQueryKey(battleId)
    }
  });

  if (isLoading || !battle) return <div className="p-12 text-center text-sm font-mono text-muted-foreground">Loading results...</div>;

  const winner = battle.participants?.find(p => p.userId === battle.winnerId);
  const sortedParticipants = [...(battle.participants || [])].sort((a, b) => a.rank_position - b.rank_position);

  const formatTime = (secs: number) => {
    if (!secs) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted-foreground mb-4">
          Match Concluded
        </div>
        
        {winner ? (
          <div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-foreground">
              {winner.username}
            </h1>
            <p className="text-muted-foreground text-lg">
              Solved in <span className="font-mono text-primary font-medium">{formatTime(winner.solveTimeSeconds!)}</span>
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-muted-foreground">
              DRAW
            </h1>
            <p className="text-muted-foreground text-lg">Time expired without a solution.</p>
          </div>
        )}
      </div>

      <div className="border border-border bg-background">
        <div className="p-4 border-b border-border bg-secondary/20">
          <h2 className="text-sm font-semibold">Final Standings</h2>
        </div>
        <div className="divide-y divide-border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-background">
              <tr>
                <th className="px-6 py-4 font-medium w-16">Rank</th>
                <th className="px-6 py-4 font-medium">Player</th>
                <th className="px-6 py-4 font-medium text-right">Time</th>
                <th className="px-6 py-4 font-medium text-right">Attempts</th>
                <th className="px-6 py-4 font-medium text-right">Penalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedParticipants.map((p, i) => (
                <tr key={p.userId} className={i === 0 && winner ? 'bg-primary/5' : ''}>
                  <td className="px-6 py-4 font-mono text-muted-foreground">{p.rank_position}</td>
                  <td className="px-6 py-4 font-medium">{p.username}</td>
                  <td className={`px-6 py-4 font-mono text-right ${p.solved ? 'text-primary' : 'text-muted-foreground'}`}>
                    {p.solved ? formatTime(p.solveTimeSeconds || 0) : '--:--'}
                  </td>
                  <td className="px-6 py-4 font-mono text-right">{p.attempts}</td>
                  <td className="px-6 py-4 font-mono text-right text-muted-foreground">+{p.penalty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" asChild>
          <Link href="/">Back to Arena</Link>
        </Button>
        <Button asChild className="group">
          <Link href="/room/create" className="flex items-center gap-2">
            New Battle <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
