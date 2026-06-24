import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetLobbyStats, useGetLobbyFeed, useGetActiveBattles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Users, Swords, Trophy, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Lobby() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useGetLobbyStats();
  const { data: feed, isLoading: feedLoading } = useGetLobbyFeed({ limit: 20 });
  const { data: activeBattles, isLoading: battlesLoading } = useGetActiveBattles();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {!user && (
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-primary mb-2">Welcome to the Arena</h2>
              <p className="text-muted-foreground">Sign in to join ranked matches, track your stats, and climb the global leaderboard.</p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setLocation("/login")}>Login</Button>
              <Button onClick={() => setLocation("/register")}>Register</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Stats Row */}
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online Players</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-bold">{stats?.onlinePlayers || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Battles</CardTitle>
            <Swords className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-bold">{stats?.activeBattles || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Waiting Rooms</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-bold">{stats?.waitingRooms || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Matches Today</CardTitle>
            <Trophy className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-bold">{stats?.totalBattlesToday || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active & Waiting Battles */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-[400px] flex flex-col">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                  </span>
                  Live Arena
                </CardTitle>
                <Link href="/room/create">
                  <Button size="sm" className="bg-accent hover:bg-accent/90">
                    <Play className="w-4 h-4 mr-2" /> Host Battle
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {battlesLoading ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : activeBattles?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <Swords className="w-12 h-12 mb-4 opacity-20" />
                    <p>No active battles right now.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {activeBattles?.map((battle: any) => (
                      <div key={battle.roomCode} className="p-4 hover:bg-secondary/50 transition-colors flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-primary text-primary">
                              {battle.battleType.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge variant={battle.status === 'active' ? 'destructive' : 'secondary'}>
                              {battle.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm">
                            <span className="font-bold">{battle.hostUsername}'s</span> room
                            <span className="text-muted-foreground mx-2">•</span>
                            {battle.playerCount}/{battle.maxPlayers} players
                          </p>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setLocation(`/room/${battle.roomCode}`)}
                        >
                          Join
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Live Feed */}
        <Card className="h-[400px] flex flex-col bg-card/50">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-lg font-bold">Live Feed</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {feedLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : feed?.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center">
                  <p>Feed is quiet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {feed?.map((event: any) => (
                    <div key={event.id} className="p-4 text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-primary">{event.username || 'System'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{event.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
