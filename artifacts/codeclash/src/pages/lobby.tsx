import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetLobbyStats, useGetLobbyFeed, useGetActiveBattles } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Users, Swords, Trophy, ChevronRight, Hash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Lobby() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useGetLobbyStats();
  const { data: feed, isLoading: feedLoading } = useGetLobbyFeed({ limit: 20 });
  const { data: activeBattles, isLoading: battlesLoading } = useGetActiveBattles();

  const scrollToBattles = () => {
    document.getElementById("active-battles")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-4xl mx-auto px-6 py-24 text-center flex flex-col items-center justify-center animate-in fade-in duration-500">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
          Battle Your Code Skills
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          CodeClash transforms coding practice into competitive multiplayer battles. Challenge friends, climb the ranks, and become a coding legend.
        </p>
        <div className="flex items-center gap-4">
          <Button size="lg" className="px-8 font-semibold" onClick={() => setLocation("/room/create")}>
            Start Battling
          </Button>
          <Button size="lg" variant="outline" className="px-8 font-semibold" onClick={scrollToBattles}>
            Browse Lobby
          </Button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-border/50 shadow-sm bg-card hover:border-border transition-colors">
            <CardContent className="p-6 text-center space-y-3">
              <h3 className="font-bold text-xl">1v1 Deathmatch</h3>
              <p className="text-sm text-muted-foreground">Head-to-head coding battles. First to solve wins.</p>
            </CardContent>
          </Card>
          <Card className="border border-border/50 shadow-sm bg-card hover:border-border transition-colors">
            <CardContent className="p-6 text-center space-y-3">
              <h3 className="font-bold text-xl">Battle Royale</h3>
              <p className="text-sm text-muted-foreground">10–100 players compete. Last coder standing wins.</p>
            </CardContent>
          </Card>
          <Card className="border border-border/50 shadow-sm bg-card hover:border-border transition-colors">
            <CardContent className="p-6 text-center space-y-3">
              <h3 className="font-bold text-xl">Live Rankings</h3>
              <p className="text-sm text-muted-foreground">ELO-based system. Climb from Bronze to Legend.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Live Data Section */}
      <div className="w-full bg-secondary/20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
          
          {/* Stats row */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" id="active-battles">
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

              <div className="space-y-px bg-border border border-border rounded-lg overflow-hidden">
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
                    <div key={battle.roomCode} className="bg-background p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/10 transition-colors">
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
              
              <div className="bg-card border border-border rounded-lg p-6 min-h-[400px]">
                {feedLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : feed?.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-10">Feed is quiet.</div>
                ) : (
                  <div className="space-y-4">
                    {feed?.map((event: any) => (
                      <div key={event.id} className="text-sm flex items-start gap-3">
                        <span className="font-mono text-xs text-muted-foreground mt-0.5 shrink-0">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-foreground leading-snug">
                          {event.username && <span className="font-semibold">{event.username} </span>}
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
      </div>
    </div>
  );
}
