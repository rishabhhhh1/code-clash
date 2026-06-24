import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetBattle, getGetBattleQueryKey, useRecordSubmission } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Clock, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

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
      battleId,
      data: {
        cfSubmissionId: parseInt(subId),
        verdict: verdict as any
      }
    }, {
      onSuccess: () => {
        toast({ title: "Recorded", description: verdict === "OK" ? "Accepted!" : verdict.replace(/_/g, ' ') });
        setSubId("");
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading || !battle) return <div className="p-12 text-center text-sm font-mono text-muted-foreground">Loading battle data...</div>;

  return (
    <div className="h-full flex flex-col pt-4 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Live Match</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Room {battle.roomCode}</h1>
        </div>
        <div className="text-3xl font-mono font-medium tracking-tight">
          {formatTime(elapsed)}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <section className="lg:col-span-2 space-y-8">
          <div className="border border-border p-6 sm:p-8 bg-background">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-sm font-mono text-muted-foreground mb-2">Problem {battle.problem.problemIndex}</div>
                <h2 className="text-2xl font-semibold">{battle.problem.title}</h2>
              </div>
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <a href={battle.problem.cfUrl} target="_blank" rel="noreferrer">
                  Open <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="text-xs font-mono px-2 py-1 bg-secondary rounded-sm">Rating {battle.problem.rating}</span>
              {battle.problem.tags?.slice(0,3).map((tag: string) => (
                <span key={tag} className="text-xs font-mono px-2 py-1 border border-border text-muted-foreground rounded-sm">{tag}</span>
              ))}
            </div>

            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-medium mb-4">Record Submission</h3>
              <form onSubmit={handleSubmitVerdict} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="space-y-1.5 w-full sm:w-auto flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Submission ID</label>
                  <Input 
                    type="number" 
                    value={subId}
                    onChange={(e) => setSubId(e.target.value)}
                    placeholder="e.g. 12345678"
                    required
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5 w-full sm:w-48">
                  <label className="text-xs font-medium text-muted-foreground">Verdict</label>
                  <Select value={verdict} onValueChange={setVerdict}>
                    <SelectTrigger className="font-mono text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OK" className="font-medium text-primary">Accepted (AC)</SelectItem>
                      <SelectItem value="WRONG_ANSWER">Wrong Answer (WA)</SelectItem>
                      <SelectItem value="TIME_LIMIT_EXCEEDED">Time Limit (TLE)</SelectItem>
                      <SelectItem value="RUNTIME_ERROR">Runtime Error (RE)</SelectItem>
                      <SelectItem value="COMPILATION_ERROR">Compilation (CE)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={submitMutation.isPending} className="w-full sm:w-auto">
                  Submit
                </Button>
              </form>
            </div>
          </div>
        </section>

        <section className="bg-background border border-border">
          <div className="p-4 border-b border-border bg-secondary/20">
            <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" /> Standings
            </h3>
          </div>
          <div className="divide-y divide-border">
            {battle.participants?.sort((a,b) => a.rank_position - b.rank_position).map((p) => (
              <div key={p.userId} className={`p-4 flex items-center justify-between ${p.solved ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs text-muted-foreground w-4">{p.rank_position}</div>
                  <div>
                    <div className="font-medium text-sm">{p.username}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{p.attempts} attempts</div>
                  </div>
                </div>
                <div className="text-right text-sm font-mono">
                  {p.solved ? (
                    <div className="text-primary font-medium">{formatTime(p.solveTimeSeconds || 0)}</div>
                  ) : p.attempts > 0 ? (
                    <div className="text-destructive text-xs">{p.lastVerdict === 'WRONG_ANSWER' ? 'WA' : 'ERR'}</div>
                  ) : (
                    <div className="text-muted-foreground/50">--:--</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
