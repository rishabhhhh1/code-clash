import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetBattle, getGetBattleQueryKey, useRecordSubmission } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Check, X, Clock, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BattleView() {
  const [, params] = useRoute("/battle/:battleId");
  const battleId = parseInt(params?.battleId || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: battle, isLoading } = useGetBattle(battleId, {
    query: {
      enabled: !!battleId,
      queryKey: getGetBattleQueryKey(battleId),
      refetchInterval: 3000
    }
  });

  const submitMutation = useRecordSubmission();
  const [verdict, setVerdict] = useState("OK");
  const [subId, setSubId] = useState("");

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (battle?.startedAt && battle.status === 'active') {
      const start = new Date(battle.startedAt).getTime();
      const timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [battle?.startedAt, battle?.status]);

  useEffect(() => {
    if (battle?.status === 'finished') {
      setLocation(`/battle/${battleId}/results`);
    }
  }, [battle?.status, battleId, setLocation]);

  const handleSubmitVerdict = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subId) return;
    
    submitMutation.mutate({
      data: {
        cfSubmissionId: parseInt(subId),
        verdict: verdict as any
      }
    }, {
      onSuccess: () => {
        toast({ title: "Submission recorded", description: verdict === "OK" ? "AC! You solved it." : `Verdict: ${verdict}` });
        setSubId("");
      },
      onError: (err: any) => {
        toast({ title: "Failed to record", description: err.message, variant: "destructive" });
      }
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading || !battle) return <div className="p-8 text-center">Loading battle data...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            LIVE BATTLE
          </h1>
          <p className="text-muted-foreground font-mono mt-2">Arena: {battle.roomCode}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold font-tabular-nums text-accent">
            {formatTime(elapsed)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Problem & Submit */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className="mb-2">Problem {battle.problem.problemIndex}</Badge>
                  <CardTitle className="text-2xl">{battle.problem.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">Rating: {battle.problem.rating}</Badge>
                    {battle.problem.tags?.slice(0,3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <a href={battle.problem.cfUrl} target="_blank" rel="noreferrer">
                    Open in Codeforces <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                <h3 className="font-bold mb-4">Record your Codeforces submission</h3>
                <form onSubmit={handleSubmitVerdict} className="flex gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <label className="text-xs text-muted-foreground">CF Submission ID</label>
                    <input 
                      type="number" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                      value={subId}
                      onChange={(e) => setSubId(e.target.value)}
                      placeholder="e.g. 12345678"
                      required
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-xs text-muted-foreground">Verdict</label>
                    <Select value={verdict} onValueChange={setVerdict}>
                      <SelectTrigger className="font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OK" className="text-green-500 font-bold">Accepted (OK)</SelectItem>
                        <SelectItem value="WRONG_ANSWER" className="text-red-500">Wrong Answer (WA)</SelectItem>
                        <SelectItem value="TIME_LIMIT_EXCEEDED" className="text-yellow-500">Time Limit (TLE)</SelectItem>
                        <SelectItem value="RUNTIME_ERROR" className="text-purple-500">Runtime Error (RE)</SelectItem>
                        <SelectItem value="COMPILATION_ERROR">Compilation Error (CE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={submitMutation.isPending}>Submit</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Live Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {battle.participants?.sort((a,b) => a.rank_position - b.rank_position).map((p) => (
                  <div key={p.userId} className={`p-4 flex items-center justify-between ${p.solved ? 'bg-green-500/10' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="font-mono font-bold w-6 text-muted-foreground">{p.rank_position}</div>
                      <div>
                        <div className="font-bold">{p.username}</div>
                        <div className="text-xs text-muted-foreground">{p.attempts} attempts</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {p.solved ? (
                        <div className="text-green-500 font-bold flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          {formatTime(p.solveTimeSeconds || 0)}
                        </div>
                      ) : p.attempts > 0 ? (
                        <div className="text-red-500 flex items-center gap-1">
                          <X className="w-4 h-4" />
                          {p.lastVerdict === 'WRONG_ANSWER' ? 'WA' : p.lastVerdict}
                        </div>
                      ) : (
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          --:--
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
