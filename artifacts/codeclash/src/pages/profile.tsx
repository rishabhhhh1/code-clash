import { useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetUserProfile, useGetMe, useGetUserBattleHistory, useSyncCodeforcesHandle } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Swords, Flame, Target, RefreshCw } from "lucide-react";
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
      onSuccess: () => toast({ title: "Synced with Codeforces" }),
      onError: (err: any) => toast({ title: "Sync failed", description: err.message, variant: "destructive" })
    });
  };

  if (profileLoading || !profileUser) return <div className="p-8 text-center">Loading profile...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header Profile Card */}
      <Card className="border-border/50 bg-card overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-destructive/20" />
        <CardContent className="pt-0 relative px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12">
            <Avatar className="w-24 h-24 border-4 border-background bg-secondary">
              <AvatarImage src={profileUser.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl font-black text-primary">{profileUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black">{profileUser.username}</h1>
                <Badge variant="outline" className="border-primary text-primary px-2 py-1 text-sm">{profileUser.rank}</Badge>
              </div>
              {profileUser.cfHandle && (
                <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
                  <span>CF: {profileUser.cfHandle}</span>
                  {isMe && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSync} disabled={syncMutation.isPending}>
                      <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {isMe && (
              <Button variant="outline">Edit Profile</Button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Rating</div>
              <div className="text-2xl font-black font-mono">{profileUser.rating} <span className="text-sm text-muted-foreground font-sans font-normal">LP</span></div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Trophy className="w-4 h-4 text-accent" /> Win Rate</div>
              <div className="text-2xl font-black font-mono">
                {profileUser.totalBattles > 0 
                  ? Math.round((profileUser.battleWins / profileUser.totalBattles) * 100) 
                  : 0}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Swords className="w-4 h-4 text-muted-foreground" /> Total Battles</div>
              <div className="text-2xl font-black font-mono">{profileUser.totalBattles}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Flame className="w-4 h-4 text-destructive" /> Win Streak</div>
              <div className="text-2xl font-black font-mono">{profileUser.winStreak}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battle History */}
      <Card>
        <CardHeader>
          <CardTitle>Combat Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            {historyLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading history...</div>
            ) : history?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No battles fought yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {history?.map((entry: any, i: number) => (
                  <div key={i} className={`p-4 flex items-center justify-between ${entry.result === 'win' ? 'bg-green-500/5' : entry.result === 'loss' ? 'bg-red-500/5' : ''}`}>
                    <div className="flex items-center gap-4">
                      <Badge variant={entry.result === 'win' ? 'default' : entry.result === 'loss' ? 'destructive' : 'secondary'} className="w-16 justify-center">
                        {entry.result.toUpperCase()}
                      </Badge>
                      <div>
                        <div className="font-bold">{entry.problemTitle} <span className="text-xs text-muted-foreground font-mono ml-2">*{entry.problemRating}</span></div>
                        <div className="text-sm text-muted-foreground">
                          {entry.battleType.replace('_', ' ').toUpperCase()} • {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-sm">
                      {entry.solveTime ? (
                        <div className="text-green-500 font-bold">{Math.floor(entry.solveTime/60)}:{String(entry.solveTime%60).padStart(2,'0')}</div>
                      ) : (
                        <div className="text-muted-foreground">--:--</div>
                      )}
                      <div className="text-muted-foreground">{entry.attempts} tries</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
