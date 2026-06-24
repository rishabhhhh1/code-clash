import { useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetUserProfile, useGetMe, useGetUserBattleHistory, useSyncCodeforcesHandle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [, params] = useRoute("/profile/:username");
  const usernameParam = params?.username;
  const isMe = !usernameParam || usernameParam === "me";
  
  const { user: authUser } = useAuth();
  const targetUsername = isMe ? authUser?.username : usernameParam;

  const { data: profileUser, isLoading: profileLoading } = isMe 
    ? useGetMe({ query: { enabled: !!authUser } }) 
    : useGetUserProfile(targetUsername!, { query: { enabled: !!targetUsername } });

  const { data: history, isLoading: historyLoading } = useGetUserBattleHistory(targetUsername!, {
    query: { enabled: !!targetUsername }
  });

  const syncMutation = useSyncCodeforcesHandle();
  const { toast } = useToast();

  const handleSync = () => {
    if (!profileUser?.cfHandle) return;
    syncMutation.mutate({ data: { cfHandle: profileUser.cfHandle } }, {
      onSuccess: () => toast({ title: "Codeforces sync complete" }),
      onError: (err: any) => toast({ title: "Sync failed", description: err.message, variant: "destructive" })
    });
  };

  if (profileLoading || !profileUser) return <div className="p-12 text-center text-sm font-mono text-muted-foreground">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-border">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{profileUser.username}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="uppercase tracking-wider font-semibold text-primary">{profileUser.rank}</span>
            {profileUser.cfHandle && (
              <>
                <span>•</span>
                <span className="font-mono">CF: {profileUser.cfHandle}</span>
              </>
            )}
          </div>
        </div>
        
        {isMe && profileUser.cfHandle && (
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending} className="gap-2">
            <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Stats
          </Button>
        )}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
        <div className="bg-background p-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Rating</div>
          <div className="text-2xl font-mono font-medium text-primary">{profileUser.rating}</div>
        </div>
        <div className="bg-background p-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Win Rate</div>
          <div className="text-2xl font-mono font-medium">
            {profileUser.totalBattles > 0 
              ? Math.round((profileUser.battleWins / profileUser.totalBattles) * 100) 
              : 0}%
          </div>
        </div>
        <div className="bg-background p-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Battles</div>
          <div className="text-2xl font-mono font-medium">{profileUser.totalBattles}</div>
        </div>
        <div className="bg-background p-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Streak</div>
          <div className="text-2xl font-mono font-medium">{profileUser.winStreak}</div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Combat Log</h2>
        
        <div className="border border-border bg-background divide-y divide-border">
          {historyLoading ? (
             <div className="p-8 text-center text-muted-foreground text-sm">Loading history...</div>
          ) : history?.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground text-sm">No battles fought yet.</div>
          ) : (
            history?.map((entry: any, i: number) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className={`text-xs font-bold uppercase tracking-widest w-12 ${entry.result === 'win' ? 'text-primary' : entry.result === 'loss' ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {entry.result}
                  </div>
                  <div>
                    <div className="font-medium">{entry.problemTitle}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {entry.battleType.replace('_', ' ').toLowerCase()} • {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-6 sm:text-right text-sm font-mono">
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Time</div>
                    <div className={entry.result === 'win' ? 'text-foreground' : 'text-muted-foreground'}>
                      {entry.solveTime ? `${Math.floor(entry.solveTime/60)}:${String(entry.solveTime%60).padStart(2,'0')}` : '--:--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Tries</div>
                    <div>{entry.attempts}</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Rating</div>
                    <div>{entry.problemRating}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
