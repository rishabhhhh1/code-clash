import { useRoute, Link } from "wouter";
import { useGetBattle, getGetBattleQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Home, Swords, Clock, Check } from "lucide-react";

export default function BattleResults() {
  const [, params] = useRoute("/battle/:battleId/results");
  const battleId = parseInt(params?.battleId || "0");

  const { data: battle, isLoading } = useGetBattle(battleId, {
    query: {
      enabled: !!battleId,
      queryKey: getGetBattleQueryKey(battleId)
    }
  });

  if (isLoading || !battle) return <div className="p-8 text-center">Loading results...</div>;

  const winner = battle.participants?.find(p => p.userId === battle.winnerId);
  const sortedParticipants = [...(battle.participants || [])].sort((a, b) => a.rank_position - b.rank_position);

  const formatTime = (secs: number) => {
    if (!secs) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4 py-8">
        <Badge variant="outline" className="border-accent text-accent mb-4">MATCH CONCLUDED</Badge>
        
        {winner ? (
          <>
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-yellow-600">
              {winner.username} WINS
            </h1>
            <p className="text-xl text-muted-foreground mt-4">
              Solved {battle.problem.title} in <span className="font-mono text-foreground">{formatTime(winner.solveTimeSeconds!)}</span>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-black text-muted-foreground">DRAW</h1>
            <p className="text-xl text-muted-foreground mt-4">No one solved the problem in time.</p>
          </>
        )}
      </div>

      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border">
          <CardTitle>Final Standings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {sortedParticipants.map((p, i) => (
              <div key={p.userId} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 ${i === 0 && winner ? 'bg-yellow-500/10' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-black w-8 text-center ${i === 0 && winner ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                    #{p.rank_position}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{p.username}</div>
                    <div className="text-sm text-muted-foreground">Rating: {p.rating}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 mt-4 sm:mt-0 text-sm font-mono">
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground mb-1">Status</span>
                    {p.solved ? (
                      <Badge className="bg-green-500 hover:bg-green-600"><Check className="w-3 h-3 mr-1"/> AC</Badge>
                    ) : (
                      <Badge variant="destructive">FAILED</Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground mb-1">Time</span>
                    <span className="font-bold">{formatTime(p.solveTimeSeconds || 0)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground mb-1">Attempts</span>
                    <span className="font-bold">{p.attempts}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground mb-1">Penalty</span>
                    <span className="font-bold text-red-400">+{p.penalty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4 pt-8">
        <Link href="/">
          <Button variant="outline" size="lg" className="gap-2">
            <Home className="w-5 h-5" /> Return to Lobby
          </Button>
        </Link>
        <Link href="/room/create">
          <Button size="lg" className="bg-accent hover:bg-accent/90 gap-2">
            <Swords className="w-5 h-5" /> New Battle
          </Button>
        </Link>
      </div>
    </div>
  );
}
