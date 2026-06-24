import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetLobbyStats, useGetLobbyFeed, useGetActiveBattles } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Users, Swords, Trophy, ChevronRight, Hash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Lobby() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useGetLobbyStats();
  const { data: feed, isLoading: feedLoading } = useGetLobbyFeed({ limit: 20 });
  const { data: activeBattles, isLoading: battlesLoading } = useGetActiveBattles();

  return (
    <div className="space-y-12 pb-12 animate-in fade-in duration-500">
      {!user && (
        <section className="bg-secondary/30 border border-border p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight mb-2">The arena awaits.</h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Sign in to join ranked matches, track your competitive metrics, and climb the global leaderboard.
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setLocation("/login")}>Log in</Button>
            <Button className="flex-1 md:flex-none" onClick={() => setLocation("/register")}>Register</Button>
          </div>
        </section>
      )}

      {/* Stats row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
        <div className="bg-background p-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <Users className="w-3 h-3" /> Online Players
          </div>
          {statsLoading ? <Skeleton className="h-8 w-16" /> : (
            <div className="text-2xl font-mono font-medium">{stats?.onlinePlayers || 0}</div>
          )}
        </div>
        <div className="bg-background p-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <Swords className="w-3 h-3" /> Active Battles
          </div>
          {statsLoading ? <Skeleton className="h-8 w-16" /> : (
            <div className="text-2xl font-mono font-medium">{stats?.activeBattles || 0}</div>
          )}
        </div>
        <div className="bg-background p-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="w-3 h-3" /> Waiting Rooms
          </div>
          {statsLoading ? <Skeleton className="h-8 w-16" /> : (
            <div className="text-2xl font-mono font-medium">{stats?.waitingRooms || 0}</div>
          )}
        </div>
        <div className="bg-background p-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <Trophy className="w-3 h-3" /> Matches Today
          </div>
          {statsLoading ? <Skeleton className="h-8 w-16" /> : (
            <div className="text-2xl font-mono font-medium">{stats?.totalBattlesToday || 0}</div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live Arena
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setLocation("/room/create")}>
              Create Room <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="space-y-px bg-border border border-border">
            {battlesLoading ? (
              <div className="bg-background p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : activeBattles?.length === 0 ? (
              <div className="bg-background p-12 text-center text-muted-foreground text-sm">
                No active battles right now. Create a room to get started.
              </div>
            ) : (
              activeBattles?.map((battle: any) => (
                <div key={battle.roomCode} className="bg-background p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{battle.hostUsername}'s Room</span>
                      <span className="text-muted-foreground text-xs font-mono px-1.5 py-0.5 bg-secondary rounded-sm">
                        {battle.battleType.replace('_', ' ').toLowerCase()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {battle.roomCode}</span>
                      <span>•</span>
                      <span>{battle.difficulty}</span>
                      <span>•</span>
                      <span>{battle.playerCount}/{battle.maxPlayers} players</span>
                    </div>
                  </div>
                  <Button variant={battle.status === 'active' ? "outline" : "default"} size="sm" onClick={() => setLocation(`/room/${battle.roomCode}`)}>
                    {battle.status === 'active' ? 'Spectate' : 'Join'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold tracking-tight">System Feed</h2>
          </div>
          
          <div className="space-y-4">
            {feedLoading ? (
               <div className="space-y-4">
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
               </div>
            ) : feed?.length === 0 ? (
              <div className="text-sm text-muted-foreground">Feed is quiet.</div>
            ) : (
              <div className="space-y-3">
                {feed?.map((event: any) => (
                  <div key={event.id} className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground mr-3">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-foreground">
                      {event.username && <span className="font-medium">{event.username} </span>}
                      <span className="text-muted-foreground">{event.message.replace(event.username || '', '').trim()}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
